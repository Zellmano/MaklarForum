"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card max-w-xl text-center">
      <h2 className="text-2xl">Något gick fel</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">Kunde inte ladda frågor. Försök igen.</p>
      <button onClick={reset} className="pill pill-dark mt-4">
        Försök igen
      </button>
    </div>
  );
}
