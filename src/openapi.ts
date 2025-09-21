import { config } from './config/index.js';

export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'ISEP ICS Bridge API',
    version: '1.0.0',
    description: 'Convert ASP portal timetable to iCalendar format for calendar applications',
    contact: {
      name: 'Bruno Camarneiro',
      email: 'bruno@camarneiro.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.port}`,
      description: 'Development server',
    },
  ],
  paths: {
    '/': {
      get: {
        summary: 'API Information',
        description: 'Get basic information about the API and available endpoints',
        responses: {
          '200': {
            description: 'API information',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'ISEP ICS Bridge' },
                    version: { type: 'string', example: '1.0.0' },
                    description: { type: 'string' },
                    endpoints: {
                      type: 'object',
                      properties: {
                        calendar: { type: 'string', example: '/calendar.ics' },
                        health: { type: 'string', example: '/healthz' },
                        docs: { type: 'string', example: '/docs' },
                        openapi: { type: 'string', example: '/openapi.json' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/calendar.ics': {
      get: {
        summary: 'Get iCalendar Feed',
        description:
          'Retrieve the ISEP timetable as an iCalendar (.ics) feed that can be imported into calendar applications',
        responses: {
          '200': {
            description: 'iCalendar content',
            content: {
              'text/calendar': {
                schema: {
                  type: 'string',
                  example: 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//ISEP ICS Bridge//local//\n...',
                },
              },
            },
            headers: {
              'Cache-Control': {
                description: 'Cache control header',
                schema: { type: 'string', example: 'public, max-age=300' },
              },
              'Access-Control-Allow-Origin': {
                description: 'CORS header',
                schema: { type: 'string', example: '*' },
              },
            },
          },
          '500': {
            description: 'Error generating calendar',
            content: {
              'text/plain': {
                schema: { type: 'string', example: 'Error generating calendar' },
              },
            },
          },
        },
      },
    },
    '/healthz': {
      get: {
        summary: 'Health Check',
        description:
          'Check the health status of the service including cache status and session validity',
        responses: {
          '200': {
            description: 'Health status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    cacheExpires: { type: 'string', format: 'date-time' },
                    sessionValid: { type: 'boolean' },
                    eventsCount: { type: 'integer' },
                    lastRefresh: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Health check failed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'error' },
                    error: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/docs': {
      get: {
        summary: 'API Documentation',
        description: 'Interactive API documentation using Swagger UI',
        responses: {
          '200': {
            description: 'Swagger UI HTML page',
          },
        },
      },
    },
    '/openapi.json': {
      get: {
        summary: 'OpenAPI Specification',
        description: 'Get the OpenAPI 3.0 specification for this API',
        responses: {
          '200': {
            description: 'OpenAPI specification',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  description: 'OpenAPI 3.0 specification',
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      HealthStatus: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok', 'error'] },
          cacheExpires: { type: 'string', format: 'date-time' },
          sessionValid: { type: 'boolean' },
          eventsCount: { type: 'integer', minimum: 0 },
          lastRefresh: { type: 'string', format: 'date-time' },
        },
      },
      ApiInfo: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          version: { type: 'string' },
          description: { type: 'string' },
          endpoints: {
            type: 'object',
            properties: {
              calendar: { type: 'string' },
              health: { type: 'string' },
              docs: { type: 'string' },
              openapi: { type: 'string' },
            },
          },
        },
      },
    },
  },
};
