export default function Loading() {
  return (
    <div className="animate-pulse space-y-10">
      <div className="rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-8">
        <div className="h-6 w-40 rounded bg-[var(--line)]" />
        <div className="mt-4 h-12 w-3/4 rounded bg-[var(--line)]" />
        <div className="mt-4 h-5 w-1/2 rounded bg-[var(--line)]" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card space-y-3">
            <div className="h-5 w-3/4 rounded bg-[var(--line)]" />
            <div className="h-4 w-full rounded bg-[var(--line)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
