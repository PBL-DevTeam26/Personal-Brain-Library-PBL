import swaggerJSDoc from 'swagger-jsdoc';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const thisDir = dirname(fileURLToPath(import.meta.url));
export const openapi = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: { title: 'PBL API', version: '0.1.0', description: 'Code-first OpenAPI, dev identity only' },
    servers: [{ url: 'http://localhost:3001' }],
    components: {
      parameters: { DevUser: { in: 'header', name: 'x-dev-user-id', required: true, schema: { type: 'string', format: 'uuid' }, description: 'LOCAL DEV ONLY: synthetic test identity' } },
      schemas: {
        Error: { type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } } } },
        Topic: { type: 'object', required: ['id', 'canonicalKey', 'displayName'], properties: { id: { type: 'string', format: 'uuid' }, canonicalKey: { type: 'string' }, displayName: { type: 'string' } } },
        QuizSession: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, topicId: { type: 'string', format: 'uuid' }, status: { type: 'string' }, questions: { type: 'array', items: { type: 'object' } } } },
      },
    },
  },
  apis: [join(thisDir, 'routes.{ts,js}')],
});
