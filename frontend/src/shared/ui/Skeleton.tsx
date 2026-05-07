import { cn } from '../lib/cn';

interface SkeletonProps {
  className?: string;
  count?: number;
}

function SkeletonLine({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'h-4 rounded-md bg-white/[0.06] animate-pulse',
        className,
      )}
    />
  );
}

export function Skeleton({ className, count = 1 }: SkeletonProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 py-2.5 px-3 rounded-lg border border-border bg-navy-800"
        >
          <div className="w-5 h-5 rounded border border-border bg-white/[0.06] animate-pulse shrink-0" />
          <SkeletonLine className="flex-1 h-4" />
          <SkeletonLine className="w-16 h-5" />
          <SkeletonLine className="w-10 h-5" />
          <SkeletonLine className="w-8 h-8 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function TaskPageSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      <div className="flex items-center gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 rounded-xl border border-border bg-navy-800 px-4 py-3 text-center">
            <div className="h-8 w-12 mx-auto rounded bg-white/[0.06] animate-pulse mb-1" />
            <div className="h-3 w-16 mx-auto rounded bg-white/[0.06] animate-pulse" />
          </div>
        ))}
      </div>
      <div className="h-3 w-full rounded-full bg-white/[0.06] animate-pulse" />
      <Skeleton count={8} />
    </div>
  );
}
