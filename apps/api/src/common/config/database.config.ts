import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 4533),
  name: process.env.DB_NAME ?? 'quicklysites',
  user: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? '2412',
  ssl: process.env.DB_SSL === 'true',
}));
