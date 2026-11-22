import type { CalendarResponse } from '../types';

export function storeNamesFromCalendars(calendars: CalendarResponse[] | undefined): string[] {
  return (calendars ?? [])
    .map((calendar) => calendar.display_name.trim())
    .filter(Boolean);
}

export function formatStoreList(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} or ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, or ${names[names.length - 1]}`;
}
