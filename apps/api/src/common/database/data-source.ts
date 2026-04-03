import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from './typeorm.config';

const configService = new ConfigService({
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 4533),
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASSWORD ?? '2412',
    name: process.env.DB_NAME ?? 'quicklysites',
    ssl: process.env.DB_SSL === 'true',
  },
});

export default new DataSource(buildTypeOrmOptions(configService));
