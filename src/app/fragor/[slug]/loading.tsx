export default function Loading() {
  return (
    <div className="animate-pulse grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="card space-y-4">
        <div className="h-4 w-32 rounded bg-[var(--line)]" />
        <div className="h-8 w-3/4 rounded bg-[var(--line)]" />
        <div className="h-20 w-full rounded bg-[var(--line)]" />
      </div>
      <div className="card space-y-3">
        <div className="h-6 w-48 rounded bg-[var(--line)]" />
        <div className="h-24 w-full rounded bg-[var(--line)]" />
      </div>
    </div>
  );
}
