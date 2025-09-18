import type { Event, HealthStatus } from '../types/index.js';
import { createCacheExpiryDate, generateWeekRange } from '../utils/date.js';
import { buildIcsContent } from '../utils/ics.js';
import { fetchWeekEvents } from './isep-api.js';
import { testSessionValidity } from './session.js';

/**
 * Cache management service
 */

// Global cache
let cacheIcs: string | null = null;
let cacheExpires: Date = new Date(0);
let lastRefresh: Date | null = null;

export async function refreshCache(): Promise<void> {
  console.log('Refreshing cache...');

  // Test session validity first
  if (!(await testSessionValidity())) {
    console.error('Session cookies are invalid or expired');
    console.error('Manual intervention required:');
    console.error('1. Login to https://portal.isep.ipp.pt manually');
    console.error('2. Capture fresh cookies from browser developer tools');
    console.error('3. Update the setupSessionCookies() function with new cookie values');
    console.error('4. Restart the service');
    return;
  }

  const weeks = generateWeekRange();
  console.log(`Fetching events for ${weeks.length} weeks in parallel...`);

  // Parallel processing - this is the key performance improvement!
  const weekPromises = weeks.map((date) => fetchWeekEvents(date));
  const results = await Promise.allSettled(weekPromises);

  const allEvents: Event[] = [];
  const seen = new Set<string>();

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      const { events } = result.value;
      for (const event of events) {
        const key = `${event.start.getTime()}-${event.end.getTime()}-${event.summary}`;
        if (!seen.has(key)) {
          seen.add(key);
          allEvents.push(event);
        }
      }
    }
  }

  // Sort events by start time
  allEvents.sort((a, b) => a.start.getTime() - b.start.getTime());

  cacheIcs = buildIcsContent(allEvents);
  cacheExpires = createCacheExpiryDate();
  lastRefresh = new Date();

  console.log(
    `Refreshed cache with ${allEvents.length} events; valid until ${cacheExpires.toISOString()}`
  );
}

export async function getCachedIcs(): Promise<string> {
  const now = new Date();

  if (!cacheIcs || now >= cacheExpires) {
    await refreshCache();
  }

  return cacheIcs || '';
}

export async function getHealthStatus(): Promise<HealthStatus> {
  const sessionValid = await testSessionValidity();
  const eventsCount = cacheIcs ? (cacheIcs.match(/BEGIN:VEVENT/g) || []).length : 0;

  return {
    status: 'ok' as const,
    cacheExpires: cacheExpires.toISOString(),
    sessionValid,
    eventsCount,
    lastRefresh: lastRefresh?.toISOString(),
  };
}
