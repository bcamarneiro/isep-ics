import { swaggerUI } from '@hono/swagger-ui';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { config } from './config.js';
import { openApiSpec } from './openapi.js';
import { getCachedIcs, getHealthStatus } from './service.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// OpenAPI specification is imported from separate file

// Routes
app.get('/', (c) => {
  return c.json({
    name: 'ISEP ICS Bridge',
    version: '1.0.0',
    description: 'Convert ASP portal timetable to iCalendar',
    endpoints: {
      calendar: '/calendar.ics',
      health: '/healthz',
      docs: '/docs',
      openapi: '/openapi.json',
    },
  });
});

// OpenAPI JSON endpoint
app.get('/openapi.json', (c) => {
  return c.json(openApiSpec);
});

// Swagger UI
app.get('/docs', swaggerUI({ url: '/openapi.json' }));

app.get('/calendar.ics', async (c) => {
  try {
    const icsContent = await getCachedIcs();

    return c.text(icsContent, 200, {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'public, max-age=300', // 5 minutes cache
      'Access-Control-Allow-Origin': '*',
    });
  } catch (error) {
    console.error('Error generating calendar:', error);
    return c.text('Error generating calendar', 500);
  }
});

app.get('/healthz', async (c) => {
  try {
    const health = await getHealthStatus();
    return c.json(health);
  } catch (error) {
    console.error('Health check failed:', error);
    return c.json(
      {
        status: 'error',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// Error handling
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json(
    {
      error: 'Internal server error',
      message: err.message,
      timestamp: new Date().toISOString(),
    },
    500
  );
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Not found',
      message: 'The requested resource was not found',
      timestamp: new Date().toISOString(),
    },
    404
  );
});

// Start server
console.log(`🚀 ISEP ICS Bridge starting on port ${config.port}`);
console.log(`📅 Calendar endpoint: http://localhost:${config.port}/calendar.ics`);
console.log(`🏥 Health endpoint: http://localhost:${config.port}/healthz`);
console.log(`📚 API Documentation: http://localhost:${config.port}/docs`);
console.log(`📋 OpenAPI Spec: http://localhost:${config.port}/openapi.json`);

export default {
  port: config.port,
  fetch: app.fetch,
};
