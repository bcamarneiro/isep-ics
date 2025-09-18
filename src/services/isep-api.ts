import { API_URLS, config } from '../config/index.js';
import type { Event, WeekEvent } from '../types/index.js';
import { formatDateForApi } from '../utils/date.js';
import { extractEvents } from '../utils/parser.js';
import { buildRequestHeaders, setupSessionCookies } from './session.js';

/**
 * ISEP API service for fetching timetable data
 */

export async function getCodeWeekForDate(date: Date): Promise<string | null> {
  const dataStr = formatDateForApi(date);
  const cookies = setupSessionCookies();

  const response = await fetch(API_URLS.getCodeWeek, {
    method: 'POST',
    headers: buildRequestHeaders(cookies),
    body: JSON.stringify({ data: dataStr }),
  });

  if (!response.ok) {
    throw new Error(`getCodeWeek failed: ${response.status}`);
  }

  const data = await response.json();
  return data.d || null;
}

export async function getWeekEvents(codeWeek: string): Promise<Event[]> {
  const payload = {
    code_week: codeWeek,
    code_user: config.codeUser,
    entidade: config.entidade,
    code_user_code: config.codeUserCode,
  };

  const cookies = setupSessionCookies();

  const response = await fetch(API_URLS.mudarSemana, {
    method: 'POST',
    headers: buildRequestHeaders(cookies),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`mudar_semana failed: ${response.status}`);
  }

  const data = await response.json();
  const jsBlob = data.d || '';
  return extractEvents(jsBlob);
}

export async function fetchWeekEvents(date: Date): Promise<WeekEvent | null> {
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
