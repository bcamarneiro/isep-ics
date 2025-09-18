import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { config } from './config/index.js';
import { API_ENDPOINTS } from './constants/index.js';
import { getApiInfoHandler, getOpenApiHandler } from './controllers/api.js';
import { getCalendarHandler } from './controllers/calendar.js';
import { getHealthHandler } from './controllers/health.js';
import { corsMiddleware } from './middleware/cors.js';
import { createErrorHandler, createNotFoundHandler } from './middleware/error-handler.js';
import { swaggerMiddleware } from './middleware/swagger.js';

/**
 * Main application setup
 */
const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', corsMiddleware);

// Routes
app.get(API_ENDPOINTS.ROOT, getApiInfoHandler);
app.get(API_ENDPOINTS.OPENAPI, getOpenApiHandler);
app.get(API_ENDPOINTS.DOCS, swaggerMiddleware);
app.get(API_ENDPOINTS.CALENDAR, getCalendarHandler);
app.get(API_ENDPOINTS.HEALTH, getHealthHandler);

// Error handling
app.onError(createErrorHandler());
app.notFound(createNotFoundHandler());

// Start server
console.log(`🚀 ISEP ICS Bridge starting on port ${config.port}`);
console.log(`📅 Calendar endpoint: http://localhost:${config.port}${API_ENDPOINTS.CALENDAR}`);
console.log(`🏥 Health endpoint: http://localhost:${config.port}${API_ENDPOINTS.HEALTH}`);
console.log(`📚 API Documentation: http://localhost:${config.port}${API_ENDPOINTS.DOCS}`);
console.log(`📋 OpenAPI Spec: http://localhost:${config.port}${API_ENDPOINTS.OPENAPI}`);

export default {
  port: config.port,
  fetch: app.fetch,
} as const;
