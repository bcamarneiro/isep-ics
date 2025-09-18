/**
 * Application constants
 */

export const API_ENDPOINTS = {
  CALENDAR: '/calendar.ics',
  HEALTH: '/healthz',
  DOCS: '/docs',
  OPENAPI: '/openapi.json',
  ROOT: '/',
} as const;

export const HTTP_STATUS = {
  OK: 200,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const CONTENT_TYPES = {
  JSON: 'application/json',
  CALENDAR: 'text/calendar; charset=utf-8',
  HTML: 'text/html',
} as const;

export const CACHE_HEADERS = {
  CALENDAR: 'public, max-age=300', // 5 minutes cache
  CORS: '*',
} as const;

export const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:142.0) Gecko/20100101 Firefox/142.0';

export const REQUEST_HEADERS = {
  JSON: {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json, text/javascript, */*; q=0.01',
  },
} as const;

export const SWAGGER_THEME = {
  DARK: 'dark',
  LAYOUT: 'StandaloneLayout',
} as const;
