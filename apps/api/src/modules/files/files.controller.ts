import { Body, Controller, Delete, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Idempotent } from 'src/core/decorators/idempotent.decorator';
import { JwtAuthGuard } from 'src/modules/auth/jwt-auth.guard';
import { TenantModuleAccess } from 'src/modules/auth/tenant-module-access.decorator';
import { TenantMembershipGuard } from 'src/modules/auth/tenant-membership.guard';
import { CreatePresignedUploadDto } from './dto/create-presigned-upload.dto';
import { FilesService } from './files.service';

@ApiTags('Files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @TenantModuleAccess('branding')
  @Post('presign-upload')
  @Idempotent()
  createPresignedUpload(@Query('tenantId') tenantId: string, @Body() input: CreatePresignedUploadDto) {
    return this.filesService.createPresignedUpload(tenantId, input);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @TenantModuleAccess('branding')
  @Get(':fileId/access')
  getSignedAccessUrl(@Param('fileId') fileId: string, @Query('tenantId') tenantId: string) {
    return this.filesService.createSignedAccessUrl(fileId, tenantId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, TenantMembershipGuard)
  @TenantModuleAccess('site')
  @Delete(':fileId')
  @Idempotent()
  removeFile(@Param('fileId') fileId: string, @Query('tenantId') tenantId: string) {
    return this.filesService.deleteStoredFile(fileId, tenantId);
  }

  @Get('public/:fileId')
  async redirectToSignedPublicUrl(@Param('fileId') fileId: string, @Res() res: Response) {
    const { file, url } = await this.filesService.createSignedAccessUrl(fileId);
    if (file.visibility !== 'public') {
      return res.status(403).json({ message: 'El archivo no es público' });
    }

    return res.redirect(url);
  }
}
