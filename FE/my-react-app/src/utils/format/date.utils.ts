import { formatDistanceToNow, format, isToday, isYesterday, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'

export function formatRelative(iso: string): string {
  if (!iso) return ''
  try {
    const utcString = iso.endsWith('Z') || iso.includes('+') 
      ? iso 
      : `${iso.replace(' ', 'T')}Z`;
    const date = parseISO(utcString);

    return formatDistanceToNow(date, { 
      addSuffix: true, 
      locale: vi 
    });
  } catch {
    return 'vừa xong';
  }
}

export function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return 'Hôm nay';
  if (isYesterday(d)) return 'Hôm qua';
  return format(d, 'dd/MM/yyyy', { locale: vi });
}

export function shortTime(iso: string): string {
  const d = new Date(iso);
  return format(d, 'HH:mm', { locale: vi });
}