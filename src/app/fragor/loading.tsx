export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-10 w-48 rounded bg-[var(--line)]" />
      <div className="h-5 w-96 rounded bg-[var(--line)]" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card space-y-3">
            <div className="h-5 w-3/4 rounded bg-[var(--line)]" />
            <div className="h-4 w-full rounded bg-[var(--line)]" />
            <div className="h-4 w-1/2 rounded bg-[var(--line)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
