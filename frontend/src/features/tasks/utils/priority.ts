import type { PriorityKey } from '../types';

export interface PriorityInfo {
  key: PriorityKey;
  label: string;
  colorClass: string;
  hex: string;
}

export const PRIORITIES: readonly PriorityInfo[] = [
  { key: 'none', label: '-', colorClass: 'bg-priority-none/10 text-priority-none border-priority-none/30', hex: '#7B9BBF' },
  { key: 'dusuk', label: 'Dusuk', colorClass: 'bg-priority-dusuk/10 text-priority-dusuk border-priority-dusuk/30', hex: '#64B5F6' },
  { key: 'orta', label: 'Orta', colorClass: 'bg-priority-orta/10 text-priority-orta border-priority-orta/30', hex: '#FFD54F' },
  { key: 'yuksek', label: 'Yuksek', colorClass: 'bg-priority-yuksek/10 text-priority-yuksek border-priority-yuksek/30', hex: '#FF8C00' },
  { key: 'kritik', label: 'Kritik', colorClass: 'bg-priority-kritik/10 text-priority-kritik border-priority-kritik/30', hex: '#EF5350' },
];

export function getPriorityInfo(key?: string | null): PriorityInfo {
  return PRIORITIES.find((p) => p.key === key) ?? PRIORITIES[0];
}

export function getNextPriority(current?: string | null): PriorityKey {
  const idx = PRIORITIES.findIndex((p) => p.key === current);
  return PRIORITIES[(idx + 1) % PRIORITIES.length].key;
}
