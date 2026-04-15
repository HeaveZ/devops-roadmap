import { cn } from 'shared/lib/cn';
import { getLevelClass, getLevelLabel, LEVEL_STYLES } from '../utils/level';

export function LevelBadge({ level }: { level?: string | null }) {
  const cls = getLevelClass(level);
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-[10px] rounded-md border font-semibold tracking-wider uppercase',
        LEVEL_STYLES[cls],
      )}
    >
      {getLevelLabel(level)}
    </span>
  );
}
