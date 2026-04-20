import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AdminUserEntity, RefreshTokenEntity, TenantMembershipEntity } from 'src/common/entities';
import { MailService } from 'src/modules/mail/mail.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AdminUserEntity)
    private readonly usersRepository: Repository<AdminUserEntity>,
    @InjectRepository(TenantMembershipEntity)
    private readonly membershipsRepository: Repository<TenantMembershipEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokensRepository: Repository<RefreshTokenEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  private static readonly PASSWORD_RESET_TTL_MINUTES = 30;

  private hashResetToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  async login(input: LoginDto) {
    const user = await this.usersRepository.findOne({
      where: { email: input.email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const memberships = await this.membershipsRepository.find({
      where: { userId: user.id, isActive: true },
      relations: ['tenant', 'roleDefinition'],
    });

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        isPlatformAdmin: user.isPlatformAdmin,
        platformRole: user.platformRole,
      },
      {
        secret: this.configService.get<string>('app.jwtAccessSecret'),
        expiresIn: this.configService.get<string>('app.jwtAccessTtl'),
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, type: 'refresh' },
      {
        secret: this.configService.get<string>('app.jwtRefreshSecret'),
        expiresIn: this.configService.get<string>('app.jwtRefreshTtl'),
      },
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.refreshTokensRepository.save({
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        isPlatformAdmin: user.isPlatformAdmin,
        platformRole: user.platformRole,
        tenantId: user.tenantId,
        memberships: memberships.map((membership) => ({
          id: membership.id,
          roleId: membership.roleId,
          linkedStaffId: membership.linkedStaffId ?? null,
          role: membership.roleDefinition
            ? {
                id: membership.roleDefinition.id,
                code: membership.roleDefinition.code,
                name: membership.roleDefinition.name,
                permissions: membership.roleDefinition.permissions,
              }
            : null,
          tenant: {
            id: membership.tenant.id,
            name: membership.tenant.name,
            slug: membership.tenant.slug,
          },
        })),
      },
    };
  }

  async refresh(refreshToken: string) {
    let payload: {
      sub: string;
      email: string;
      type?: string;
      isPlatformAdmin?: boolean;
      platformRole?: string;
    };

    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('app.jwtRefreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const userTokens = await this.refreshTokensRepository.find({
      where: { userId: payload.sub },
      order: { createdAt: 'DESC' },
    });

    const matchedToken = await Promise.all(
      userTokens.map(async (storedToken) => ({
        storedToken,
        matches: await bcrypt.compare(refreshToken, storedToken.tokenHash),
      })),
    ).then((results) => results.find((result) => result.matches)?.storedToken);

    if (!matchedToken || matchedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found');
    }

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        isPlatformAdmin: user.isPlatformAdmin,
        platformRole: user.platformRole,
      },
      {
        secret: this.configService.get<string>('app.jwtAccessSecret'),
        expiresIn: this.configService.get<string>('app.jwtAccessTtl'),
      },
    );

    return { accessToken };
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.usersRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (!user || !user.isActive) {
      return {
        success: true,
        message: 'Si el correo existe, te enviaremos un enlace para restablecer tu contraseña.',
      };
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashResetToken(token);
    const expiresAt = new Date(Date.now() + AuthService.PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

    user.passwordResetTokenHash = tokenHash;
    user.passwordResetRequestedAt = new Date();
    user.passwordResetExpiresAt = expiresAt;
    await this.usersRepository.save(user);

    const adminUrl = this.configService.get<string>('app.adminUrl') ?? 'http://localhost:5175';
    const resetUrl = `${adminUrl.replace(/\/$/, '')}/login?resetToken=${encodeURIComponent(token)}`;

    await this.mailService.sendAdminPasswordRecoveryEmail({
      to: user.email,
      recipientName: user.fullName,
      resetUrl,
      expiresInMinutes: AuthService.PASSWORD_RESET_TTL_MINUTES,
    });

    return {
      success: true,
      message: 'Si el correo existe, te enviaremos un enlace para restablecer tu contraseña.',
    };
  }

  async resetPassword(token: string, password: string) {
    const tokenHash = this.hashResetToken(token);
    const user = await this.usersRepository.findOne({
      where: { passwordResetTokenHash: tokenHash },
    });

    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      throw new BadRequestException('El enlace de recuperación ya no es válido.');
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    user.passwordResetTokenHash = null;
    user.passwordResetRequestedAt = null;
    user.passwordResetExpiresAt = null;
    await this.usersRepository.save(user);

    await this.refreshTokensRepository.delete({ userId: user.id });

    return {
      success: true,
      message: 'Tu contraseña fue actualizada correctamente. Ya puedes iniciar sesión.',
    };
  }
}
