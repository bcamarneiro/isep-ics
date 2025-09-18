import type { Context } from 'hono';
import { CACHE_HEADERS, CONTENT_TYPES, HTTP_STATUS } from '../constants/index.js';
import { getCachedIcs } from '../services/cache.js';

/**
 * Calendar controller
 */

export async function getCalendarHandler(c: Context) {
  try {
    const icsContent = await getCachedIcs();

    return c.text(icsContent, HTTP_STATUS.OK, {
      'Content-Type': CONTENT_TYPES.CALENDAR,
      'Cache-Control': CACHE_HEADERS.CALENDAR,
      'Access-Control-Allow-Origin': CACHE_HEADERS.CORS,
    });
  } catch (error) {
    console.error('Error generating calendar:', error);
    return c.text('Error generating calendar', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}
