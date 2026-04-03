import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUserEntity, RefreshTokenEntity, TenantMembershipEntity } from 'src/common/entities';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { PlatformAdminGuard } from './platform-admin.guard';
import { TenantMembershipGuard } from './tenant-membership.guard';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([AdminUserEntity, TenantMembershipEntity, RefreshTokenEntity]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('app.jwtAccessSecret'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, TenantMembershipGuard, PlatformAdminGuard],
  exports: [TenantMembershipGuard, PlatformAdminGuard],
})
export class AuthModule {}
