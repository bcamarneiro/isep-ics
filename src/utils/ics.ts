import { zonedTimeToUtc } from 'date-fns-tz';
import { config } from '../config/index.js';
import type { Event } from '../types/index.js';
import { formatDateForIcs } from './date.js';

/**
 * iCalendar utility functions
 */

export function generateEventUid(event: Event): string {
  const startUtc = zonedTimeToUtc(event.start, config.timezone);
  const hash = Math.abs(event.summary.split('').reduce((a, b) => a + b.charCodeAt(0), 0));
  return `${Math.floor(startUtc.getTime() / 1000)}-${hash}@isep-ics`;
}

export function escapeIcsText(text: string): string {
  return text.replace(/[,\\;]/g, '\\$&');
}

export function buildIcsContent(events: Event[]): string {
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
    const uid = generateEventUid(event);

    ics += [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART:${formatDateForIcs(startUtc)}`,
      `DTEND:${formatDateForIcs(endUtc)}`,
      `SUMMARY:${escapeIcsText(event.summary)}`,
      event.location ? `LOCATION:${escapeIcsText(event.location)}` : '',
      event.description ? `DESCRIPTION:${escapeIcsText(event.description)}` : '',
      `DTSTAMP:${formatDateForIcs(now)}`,
      'END:VEVENT',
      '',
    ]
      .filter((line) => line)
      .join('\r\n');
  }

  ics += 'END:VCALENDAR\r\n';
  return ics;
}
