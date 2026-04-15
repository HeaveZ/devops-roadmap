import type { LevelKey } from '../types';

export function getLevelClass(level?: string | null): LevelKey {
  if (!level) return 'temel';
  const l = level.toLowerCase();
  if (l.includes('ileri') || l.includes('advanced')) return 'ileri';
  if (l.includes('orta') || l.includes('intermediate') || l.includes('medium')) return 'orta';
  return 'temel';
}

export function getLevelLabel(level?: string | null): string {
  const cls = getLevelClass(level);
  if (cls === 'ileri') return 'Ileri';
  if (cls === 'orta') return 'Orta';
  return 'Temel';
}

export const LEVEL_STYLES: Record<LevelKey, string> = {
  temel: 'bg-status-green/10 text-status-green border-status-green/30',
  orta: 'bg-brand/10 text-brand-bright border-brand/30',
  ileri: 'bg-accent-orange/10 text-accent-orange border-accent-orange/30',
};
