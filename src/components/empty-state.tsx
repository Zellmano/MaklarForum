import Link from "next/link";

export function EmptyState({
  title,
  description,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  description: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 py-10 text-center">
      <div className="text-3xl" aria-hidden="true">
        ✨
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="max-w-md text-sm text-[var(--muted)]">{description}</p>
      {ctaHref && ctaLabel ? (
        <Link href={ctaHref} className="pill pill-dark mt-2">
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}
