import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from './app.js';
// These smoke tests exercise the explicitly enabled local development identity.
vi.hoisted(() => {
  process.env.NODE_ENV = 'development';
  process.env.DEV_AUTH_ENABLED = 'true';
});
describe('API contract smoke tests', () => {
  it('health', async () => { const r=await request(app).get('/health'); expect(r.status).toBe(200); expect(r.body.status).toBe('ok'); });
  it('publishes code-first OpenAPI', async () => { const r=await request(app).get('/openapi.json'); expect(r.status).toBe(200); expect(r.body.paths['/api/v1/topics']).toBeDefined(); });
  it('blocks missing dev identity before database access', async () => { const r=await request(app).get('/api/v1/topics'); expect(r.status).toBe(401); });
});
