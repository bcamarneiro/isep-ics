import { z } from 'zod';

/**
 * Validation schemas and utilities
 */

export const healthStatusSchema = z.object({
  status: z.enum(['ok', 'error']),
  cacheExpires: z.string(),
  sessionValid: z.boolean(),
  eventsCount: z.number().min(0),
  lastRefresh: z.string().optional(),
});

export const apiInfoSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  endpoints: z.object({
    calendar: z.string(),
    health: z.string(),
    docs: z.string(),
    openapi: z.string(),
  }),
});

export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  timestamp: z.string(),
});

export function validateHealthStatus(data: unknown) {
  return healthStatusSchema.parse(data);
}

export function validateApiInfo(data: unknown) {
  return apiInfoSchema.parse(data);
}

export function validateErrorResponse(data: unknown) {
  return errorResponseSchema.parse(data);
}
