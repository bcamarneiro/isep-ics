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
app.get(
  '/docs',
  swaggerUI({
    url: '/openapi.json',
    config: {
      deepLinking: true,
      displayRequestDuration: true,
      tryItOutEnabled: true,
      requestInterceptor: (req: any) => {
        return req;
      },
      responseInterceptor: (res: any) => {
        return res;
      },
      layout: 'StandaloneLayout',
      plugins: [
        {
          statePlugins: {
            spec: {
              wrapSelectors: {
                allowTryItOutFor: () => () => true,
              },
            },
          },
        },
      ],
      // Dark theme configuration
      theme: 'dark',
      customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui { background-color: #1a1a1a; color: #ffffff; }
      .swagger-ui .info { background-color: #2d2d2d; }
      .swagger-ui .scheme-container { background-color: #2d2d2d; }
      .swagger-ui .opblock { background-color: #2d2d2d; border-color: #404040; }
      .swagger-ui .opblock .opblock-summary { border-color: #404040; }
      .swagger-ui .opblock.opblock-get { border-color: #61affe; background-color: rgba(97, 175, 254, 0.1); }
      .swagger-ui .opblock.opblock-post { border-color: #49cc90; background-color: rgba(73, 204, 144, 0.1); }
      .swagger-ui .opblock.opblock-put { border-color: #fca130; background-color: rgba(252, 161, 48, 0.1); }
      .swagger-ui .opblock.opblock-delete { border-color: #f93e3e; background-color: rgba(249, 62, 62, 0.1); }
      .swagger-ui .btn { background-color: #404040; border-color: #404040; color: #ffffff; }
      .swagger-ui .btn:hover { background-color: #505050; border-color: #505050; }
      .swagger-ui .btn.execute { background-color: #4990e2; border-color: #4990e2; }
      .swagger-ui .btn.execute:hover { background-color: #357abd; border-color: #357abd; }
      .swagger-ui .parameter__name { color: #ffffff; }
      .swagger-ui .parameter__type { color: #61affe; }
      .swagger-ui .response-col_status { color: #ffffff; }
      .swagger-ui .response-col_description__inner { color: #ffffff; }
      .swagger-ui .model { color: #ffffff; }
      .swagger-ui .model-title { color: #ffffff; }
      .swagger-ui .prop-name { color: #ffffff; }
      .swagger-ui .prop-type { color: #61affe; }
      .swagger-ui .prop-format { color: #61affe; }
      .swagger-ui .table thead tr th, .swagger-ui .table tbody tr td { border-color: #404040; color: #ffffff; }
      .swagger-ui .highlight-code { background-color: #2d2d2d; }
      .swagger-ui .microlight { background-color: #2d2d2d; color: #ffffff; }
      .swagger-ui .highlight-code .microlight { background-color: #2d2d2d; color: #ffffff; }
    `,
    },
  })
);

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
