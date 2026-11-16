import 'dotenv/config';
export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  devAuthEnabled: process.env.DEV_AUTH_ENABLED === 'true',
  port: Number(process.env.PORT ?? 3001),
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://pbl:pbl_local_only@localhost:5433/pbl',
};
export const DEV_USER_ID = '00000000-0000-4000-8000-000000000001';
export function assertSafeConfiguration(): void {
  if (config.nodeEnv !== 'development') throw new Error('Production/staging auth is not implemented: refusing startup');
  if (!config.devAuthEnabled) throw new Error('Dev auth disabled, real auth not yet implemented: refusing startup');
}
