import * as cheerio from 'cheerio';
import { Event } from './types.js';

// Regex patterns for parsing JavaScript date objects and event blocks
const DATE_REGEX = /new Date\(\s*(\d{4})\s*,\s*(\d{1,2})\s*,\s*(\d{1,2})\s*,\s*(\d{1,2})\s*,\s*(\d{1,2})\s*\)/g;
const EVENT_BLOCK_REGEX = /\{[^{}]*?['"]start['"]\s*:\s*new Date\([^\)]*\)[\s\S]*?['"]end['"]\s*:\s*new Date\([^\)]*\)[\s\S]*?\}/g;

/**
 * Parse JavaScript Date constructor to native Date object
 * Note: JavaScript months are 0-based, so we add 1
 */
function parseJsDate(match: RegExpMatchArray): Date {
  if (!match || match.length < 6) {
    throw new Error('Invalid date match');
  }
  const [, year, month, day, hour, minute] = match.map(Number);
  return new Date(year, month, day, hour, minute);
}

/**
 * Strip HTML tags and normalize whitespace
 */
function stripHtml(html: string): string {
  if (!html) return '';
  const $ = cheerio.load(html);
  return $.text().replace(/\s+/g, ' ').trim();
}

/**
 * Unescape JavaScript string literals
 */
function unescapeJs(str: string): string {
  return str
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, ' ')
    .replace(/\\t/g, ' ');
}

/**
 * Extract room/location from text using heuristics
 */
function extractLocation(text: string): string {
  const locationMatch = text.match(/(Sala\s+[A-Za-z0-9\-]+|[A-Z]-\d{2,3})/);
  return locationMatch ? locationMatch[0] : '';
}

/**
 * Parse JavaScript blob containing event data and extract calendar events
 * 
 * Expected format:
 * <script> ... events: [{
 *   start: new Date(2025, 8, 18, 18, 10),
 *   end: new Date(2025, 8, 18, 19, 50),
 *   title: '<table>...',
 *   body: '<table>...'
 * }, ...] </script>
 */
export function extractEvents(jsBlob: string): Event[] {
  if (!jsBlob) return [];

  const events: Event[] = [];
  const eventBlocks = jsBlob.match(EVENT_BLOCK_REGEX);

  if (!eventBlocks) return events;

  for (const block of eventBlocks) {
    try {
      // Extract start date
      const startMatches = Array.from(block.matchAll(DATE_REGEX));
      if (startMatches.length < 2) continue;

      const startDate = parseJsDate(startMatches[0]);
      const endDate = parseJsDate(startMatches[1]);

      // Extract title and body with proper quote handling
      const titleMatch = block.match(/['"]title['"]\s*:\s*(['"])(.*?)\1/s);
      const bodyMatch = block.match(/['"]body['"]\s*:\s*(['"])(.*?)\1/s);

      const titleHtml = titleMatch ? unescapeJs(titleMatch[2]) : '';
      const bodyHtml = bodyMatch ? unescapeJs(bodyMatch[2]) : '';

      const titleText = stripHtml(titleHtml);
      const bodyText = stripHtml(bodyHtml);
      const location = extractLocation(titleText);

      events.push({
        start: startDate,
        end: endDate,
        summary: titleText.slice(0, 200) || 'Class',
        location,
        description: bodyText.slice(0, 2000),
      });
    } catch (error) {
      console.warn('Failed to parse event block:', error);
      continue;
    }
  }

  return events;
}
