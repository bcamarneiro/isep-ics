import type { Context } from 'hono';
import { API_ENDPOINTS } from '../constants/index.js';
import { openApiSpec } from '../openapi.js';
import type { ApiInfo } from '../types/index.js';

/**
 * API information controller
 */

export function getApiInfoHandler(c: Context) {
  const apiInfo: ApiInfo = {
    name: 'ISEP ICS Bridge',
    version: '1.0.0',
    description: 'Convert ASP portal timetable to iCalendar',
    endpoints: {
      calendar: API_ENDPOINTS.CALENDAR,
      health: API_ENDPOINTS.HEALTH,
      docs: API_ENDPOINTS.DOCS,
      openapi: API_ENDPOINTS.OPENAPI,
    },
  };

  return c.json(apiInfo);
}

export function getOpenApiHandler(c: Context) {
  return c.json(openApiSpec);
}
