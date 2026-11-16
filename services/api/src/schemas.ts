import { z } from 'zod';
export const uuid = z.string().uuid();
export const sessionCreateSchema = z.object({ topicId: uuid }).strict();
export const answerCreateSchema = z.object({
  questionId: uuid,
  answer: z.union([z.string().min(1).max(2000), z.array(z.string().min(1)).min(1).max(10)]),
  idempotencyKey: uuid,
}).strict();
export function validateBody<T>(schema: z.ZodSchema<T>, value: unknown): T { return schema.parse(value); }
