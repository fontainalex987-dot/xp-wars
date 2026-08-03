// Skeletons shimmer réutilisables (dark mode).
export function SkeletonBar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-zinc-800 ${className}`} />;
}

export function ProfileSkeleton() {
  return (
    <div className="px-5 pt-8 flex flex-col items-center gap-4">
      <div className="size-24 rounded-full bg-zinc-800 animate-pulse" />
      <SkeletonBar className="h-5 w-40" />
      <SkeletonBar className="h-4 w-28" />
    </div>
  );
}

export function TaskListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="px-5 space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-[18px] bg-zinc-900/60 ring-1 ring-white/5 flex items-center gap-3">
          <div className="flex-1 space-y-2">
            <SkeletonBar className="h-3 w-24" />
            <SkeletonBar className="h-4 w-3/4" />
            <SkeletonBar className="h-3 w-1/2" />
          </div>
          <div className="size-12 rounded-xl bg-zinc-800 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function FeedSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/60 ring-1 ring-white/5">
          <div className="size-10 rounded-full bg-zinc-800 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonBar className="h-3.5 w-2/3" />
            <SkeletonBar className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="space-y-6">
      <ProfileSkeleton />
      <div className="px-5 space-y-3">
        <SkeletonBar className="h-24 w-full rounded-2xl" />
        <SkeletonBar className="h-3 w-1/3" />
      </div>
      <TaskListSkeleton />
    </div>
  );
}
