import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { config } from './config.js';
import { getCachedIcs, getHealthStatus } from './service.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Routes
app.get('/', (c) => {
  return c.json({
    name: 'ISEP ICS Bridge',
    version: '1.0.0',
    description: 'Convert ASP portal timetable to iCalendar',
    endpoints: {
      calendar: '/calendar.ics',
      health: '/healthz'
    }
  });
});

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
    return c.json({
      status: 'error',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Error handling
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString()
  }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not found',
    message: 'The requested resource was not found',
    timestamp: new Date().toISOString()
  }, 404);
});

// Start server
console.log(`🚀 ISEP ICS Bridge starting on port ${config.port}`);
console.log(`📅 Calendar endpoint: http://localhost:${config.port}/calendar.ics`);
console.log(`🏥 Health endpoint: http://localhost:${config.port}/healthz`);

export default {
  port: config.port,
  fetch: app.fetch,
};
