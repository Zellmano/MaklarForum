export default function Loading() {
  return (
    <div className="animate-pulse grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <div className="card space-y-4">
        <div className="h-4 w-32 rounded bg-[var(--line)]" />
        <div className="h-8 w-3/4 rounded bg-[var(--line)]" />
        <div className="h-4 w-1/2 rounded bg-[var(--line)]" />
        <div className="h-16 w-full rounded bg-[var(--line)]" />
      </div>
      <div className="space-y-4">
        <div className="h-7 w-40 rounded bg-[var(--line)]" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card space-y-2">
            <div className="h-4 w-full rounded bg-[var(--line)]" />
            <div className="h-4 w-3/4 rounded bg-[var(--line)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
