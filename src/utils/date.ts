import { addWeeks, format } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { config } from '../config/index.js';

/**
 * Date utility functions
 */

export function getCurrentDateInTimezone(): Date {
  return utcToZonedTime(new Date(), config.timezone);
}

export function formatDateForApi(date: Date): string {
  return format(date, 'EEE MMM dd yyyy');
}

export function formatDateForIcs(date: Date): string {
  return format(date, "yyyyMMdd'T'HHmmss'Z'");
}

export function convertToUtc(date: Date): Date {
  return zonedTimeToUtc(date, config.timezone);
}

export function convertFromUtc(date: Date): Date {
  return utcToZonedTime(date, config.timezone);
}

export function generateWeekRange(): Date[] {
  const today = getCurrentDateInTimezone();
  return Array.from({ length: config.weeksBefore + config.weeksAfter + 1 }, (_, i) =>
    addWeeks(today, i - config.weeksBefore)
  );
}

export function createCacheExpiryDate(): Date {
  return new Date(Date.now() + config.refreshMinutes * 60 * 1000);
}
