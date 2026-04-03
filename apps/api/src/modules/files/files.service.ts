import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { FileObjectEntity, TenantEntity } from 'src/common/entities';
import { CreatePresignedUploadDto } from './dto/create-presigned-upload.dto';

type S3Config = {
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  publicBaseUrl?: string;
  presignTtlSeconds: number;
};

const RESOURCE_FOLDER_MAP = {
  branding: 'branding',
  site: 'site',
  gallery: 'gallery',
} as const;

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(FileObjectEntity)
    private readonly filesRepository: Repository<FileObjectEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenantsRepository: Repository<TenantEntity>,
  ) {}

  async createPresignedUpload(tenantId: string, input: CreatePresignedUploadDto) {
    const tenant = await this.tenantsRepository.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado para cargar archivos');
    }

    const s3 = this.getS3Client();
    const config = this.getS3Config();
    const sanitizedFilename = this.sanitizeFilename(input.filename);
    const folder = RESOURCE_FOLDER_MAP[input.resourceType] ?? 'site';
    const storageKey = `tenants/${tenantId}/${folder}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${sanitizedFilename}`;

    const file = await this.filesRepository.save({
      tenantId,
      storageKey,
      filename: sanitizedFilename,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes ?? 0,
      provider: 's3',
      visibility: input.visibility ?? 'private',
      metadata: {
        resourceType: input.resourceType,
        ...(input.metadata ?? {}),
      },
    });

    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: storageKey,
        ContentType: input.contentType,
      }),
      { expiresIn: config.presignTtlSeconds },
    );

    return {
      fileId: file.id,
      uploadUrl,
      storageKey,
      expiresIn: config.presignTtlSeconds,
      method: 'PUT',
      headers: {
        'content-type': input.contentType,
      },
    };
  }

  async createSignedAccessUrl(fileId: string, tenantId?: string) {
    const file = await this.filesRepository.findOne({
      where: tenantId ? { id: fileId, tenantId } : { id: fileId },
    });

    if (!file) {
      throw new NotFoundException('Archivo no encontrado');
    }

    return {
      file,
      url: await this.buildSignedAccessUrl(file),
    };
  }

  async buildSignedAccessUrl(file: FileObjectEntity) {
    const config = this.getS3Config();

    return getSignedUrl(
      this.getS3Client(),
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: file.storageKey,
        ResponseContentType: file.contentType,
        ResponseContentDisposition: `inline; filename="${file.filename}"`,
      }),
      { expiresIn: config.presignTtlSeconds },
    );
  }

  async resolveStoredReference(reference?: string | null, tenantId?: string) {
    if (!reference) {
      return null;
    }

    const match = reference.match(/^file:([0-9a-f-]+)$/i);
    if (!match) {
      return reference;
    }

    try {
      const { url } = await this.createSignedAccessUrl(match[1], tenantId);
      return url;
    } catch (error) {
      this.logger.warn(
        `No se pudo resolver asset ${reference}${tenantId ? ` para tenant ${tenantId}` : ''}: ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      );
      return null;
    }
  }

  async resolveContentAssets<T>(value: T, tenantId?: string): Promise<T> {
    if (typeof value === 'string') {
      return (await this.resolveStoredReference(value, tenantId)) as T;
    }

    if (Array.isArray(value)) {
      const resolved = await Promise.all(value.map((item) => this.resolveContentAssets(item, tenantId)));
      return resolved as T;
    }

    if (value && typeof value === 'object') {
      const entries = await Promise.all(
        Object.entries(value as Record<string, unknown>).map(async ([key, nestedValue]) => [
          key,
          await this.resolveContentAssets(nestedValue, tenantId),
        ]),
      );

      return Object.fromEntries(entries) as T;
    }

    return value;
  }

  private getS3Client() {
    const config = this.getS3Config();
    return new S3Client({
      region: config.region,
      endpoint: config.endpoint || undefined,
      forcePathStyle: Boolean(config.endpoint),
      requestChecksumCalculation: 'WHEN_REQUIRED',
      credentials:
        config.accessKeyId && config.secretAccessKey
          ? {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            }
          : undefined,
    });
  }

  private getS3Config(): S3Config {
    const config = this.configService.get<S3Config>('app.s3');
    if (!config?.bucket || !config.region) {
      throw new BadRequestException('La configuración S3 no está completa en el backend');
    }
    return config;
  }

  private sanitizeFilename(filename: string) {
    return filename
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .slice(0, 160) || `archivo-${randomUUID()}`;
  }

}
