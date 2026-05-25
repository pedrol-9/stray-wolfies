import {
  SCHEDULE_END_HOUR,
  SCHEDULE_START_HOUR,
  TIMEZONE,
} from './constants';

/** ¿Estamos dentro del horario habitual (5–11 p. m.)? Solo informativo; no bloquea si la tienda está abierta manualmente. */
export function isWithinUsualSchedule(now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  return hour >= SCHEDULE_START_HOUR && hour < SCHEDULE_END_HOUR;
}
