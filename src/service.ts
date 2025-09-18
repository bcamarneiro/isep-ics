import { addWeeks, format } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { API_URLS, config } from './config.js';
import { extractEvents } from './parser.js';
import type { Event, SessionCookies, WeekEvent } from './types.js';

// Global cache
let cacheIcs: string | null = null;
let cacheExpires: Date = new Date(0);
let lastRefresh: Date | null = null;

/**
 * Set up session cookies for authentication
 */
export function setupSessionCookies(): SessionCookies {
  // These are the working session cookies from your HAR file
  // You'll need to update these with fresh cookies from your browser
  return {
    _ga_DM23NHK9JJ: 'GS2.1.s1757329188$o6$g1$t1757330340$j60$l0$h1679497609',
    _ga: 'GA1.1.1519809505.1756756750',
    ApplicationGatewayAffinityCORS: '55cd1562ba78615c3384c2c7dd016cc3',
    ApplicationGatewayAffinity: '55cd1562ba78615c3384c2c7dd016cc3',
    ASPSESSIONIDQWSQCCSB: 'EIGBHGOBFHPGMNOICAPFMEPA',
    EUIPPSESSIONGUID: 'cdbb5af5-f477-49e4-be8d-9f70f6099502',
    ASPSESSIONIDQUSRCCTB: 'FGBFNPOBLFLCNKIOJNCNGGPI',
    ASPSESSIONIDQQWRCCTB: 'GHBFNPOBJFNBFGLFOOEFFKPP',
    ASPSESSIONIDQWQRBDTA: 'IEPFMGPDPLNLPOELMADJNLBB',
    ASPSESSIONIDQSURBDTA: 'BHPFMGPDFGJNLJICEBLLAFMC',
    ASPSESSIONIDSWQQBAQC: 'CDKDDJPDBDDEJOMNLLLFEKFK',
    ASPSESSIONIDSUQRCDQB: 'AOPBGJPDLEOOOFNBKIPHLOCF',
    ASPSESSIONIDSWQSAAQB: 'EDEJMAAAGAIMEODENDDLNCAJ',
    ASPSESSIONIDQQXTDCRA: 'CFHHKHFBNNFGCEOOAFBAPBGL',
  };
}

/**
 * Test if session cookies are still valid
 */
export async function testSessionValidity(): Promise<boolean> {
  try {
    const today = utcToZonedTime(new Date(), config.timezone);
    const dataStr = format(today, 'EEE MMM dd yyyy');

    const response = await fetch(API_URLS.getCodeWeek, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json, text/javascript, */*; q=0.01',
        Origin: config.baseUrl,
        Referer: `${config.baseUrl}/intranet/ver_horario/ver_horario.aspx?user=${config.codeUser}`,
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:142.0) Gecko/20100101 Firefox/142.0',
        Cookie: Object.entries(setupSessionCookies())
          .map(([name, value]) => `${name}=${value}`)
          .join('; '),
      },
      body: JSON.stringify({ data: dataStr }),
    });

    if (response.ok) {
      console.log('Session cookies are still valid');
      return true;
    } else {
      console.warn(`Session cookies may be expired - API returned ${response.status}`);
      return false;
    }
  } catch (error) {
    console.warn('Session validity test failed:', error);
    return false;
  }
}

/**
 * Get code week for a specific date
 */
async function getCodeWeekForDate(date: Date): Promise<string | null> {
  const dataStr = format(date, 'EEE MMM dd yyyy');

  const response = await fetch(API_URLS.getCodeWeek, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json, text/javascript, */*; q=0.01',
      Origin: config.baseUrl,
      Referer: `${config.baseUrl}/intranet/ver_horario/ver_horario.aspx?user=${config.codeUser}`,
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:142.0) Gecko/20100101 Firefox/142.0',
      Cookie: Object.entries(setupSessionCookies())
        .map(([name, value]) => `${name}=${value}`)
        .join('; '),
    },
    body: JSON.stringify({ data: dataStr }),
  });

  if (!response.ok) {
    throw new Error(`getCodeWeek failed: ${response.status}`);
  }

  const data = await response.json();
  return data.d || null;
}

/**
 * Get week events for a specific code week
 */
async function getWeekEvents(codeWeek: string): Promise<Event[]> {
  const payload = {
    code_week: codeWeek,
    code_user: config.codeUser,
    entidade: config.entidade,
    code_user_code: config.codeUserCode,
  };

  const response = await fetch(API_URLS.mudarSemana, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json, text/javascript, */*; q=0.01',
      Origin: config.baseUrl,
      Referer: `${config.baseUrl}/intranet/ver_horario/ver_horario.aspx?user=${config.codeUser}`,
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:142.0) Gecko/20100101 Firefox/142.0',
      Cookie: Object.entries(setupSessionCookies())
        .map(([name, value]) => `${name}=${value}`)
        .join('; '),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`mudar_semana failed: ${response.status}`);
  }

  const data = await response.json();
  const jsBlob = data.d || '';
  return extractEvents(jsBlob);
}

/**
 * Fetch events for a single week (used in parallel processing)
 */
async function fetchWeekEvents(date: Date): Promise<WeekEvent | null> {
  try {
    const codeWeek = await getCodeWeekForDate(date);
    if (!codeWeek) return null;

    const events = await getWeekEvents(codeWeek);
    return { codeWeek, events };
  } catch (error) {
    console.warn(`Failed to fetch events for ${date.toISOString()}:`, error);
    return null;
  }
}

/**
 * Build iCalendar content from events
 */
function buildIcs(events: Event[]): string {
  const now = new Date();
  const timezone = config.timezone;

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ISEP ICS Bridge//local//',
    'METHOD:PUBLISH',
    'CALSCALE:GREGORIAN',
    `X-WR-TIMEZONE:${timezone}`,
    `X-WR-CALNAME:ISEP Schedule`,
    `X-WR-CALDESC:ISEP Class Schedule`,
    '',
  ].join('\r\n');

  for (const event of events) {
    const startUtc = zonedTimeToUtc(event.start, timezone);
    const endUtc = zonedTimeToUtc(event.end, timezone);

    const uid = `${Math.floor(startUtc.getTime() / 1000)}-${Math.abs(event.summary.split('').reduce((a, b) => a + b.charCodeAt(0), 0))}@isep-ics`;

    ics += [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART:${format(startUtc, "yyyyMMdd'T'HHmmss'Z'")}`,
      `DTEND:${format(endUtc, "yyyyMMdd'T'HHmmss'Z'")}`,
      `SUMMARY:${event.summary.replace(/[,\\;]/g, '\\$&')}`,
      event.location ? `LOCATION:${event.location.replace(/[,\\;]/g, '\\$&')}` : '',
      event.description ? `DESCRIPTION:${event.description.replace(/[,\\;]/g, '\\$&')}` : '',
      `DTSTAMP:${format(now, "yyyyMMdd'T'HHmmss'Z'")}`,
      'END:VEVENT',
      '',
    ]
      .filter((line) => line)
      .join('\r\n');
  }

  ics += 'END:VCALENDAR\r\n';
  return ics;
}

/**
 * Refresh cache with parallel API calls for better performance
 */
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

  const today = utcToZonedTime(new Date(), config.timezone);
  const weeks = Array.from({ length: config.weeksBefore + config.weeksAfter + 1 }, (_, i) =>
    addWeeks(today, i - config.weeksBefore)
  );

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

  cacheIcs = buildIcs(allEvents);
  cacheExpires = new Date(Date.now() + config.refreshMinutes * 60 * 1000);
  lastRefresh = new Date();

  console.log(
    `Refreshed cache with ${allEvents.length} events; valid until ${cacheExpires.toISOString()}`
  );
}

/**
 * Get cached iCalendar content, refreshing if necessary
 */
export async function getCachedIcs(): Promise<string> {
  const now = new Date();

  if (!cacheIcs || now >= cacheExpires) {
    await refreshCache();
  }

  return cacheIcs || '';
}

/**
 * Get health status
 */
export async function getHealthStatus() {
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
