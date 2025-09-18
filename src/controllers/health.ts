import type { Context } from 'hono';
import { HTTP_STATUS } from '../constants/index.js';
import { getHealthStatus } from '../services/cache.js';

/**
 * Health controller
 */

export async function getHealthHandler(c: Context) {
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
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}
