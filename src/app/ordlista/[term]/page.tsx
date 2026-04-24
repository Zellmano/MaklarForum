import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { glossaryTerms } from "@/lib/mock-data";

export function generateStaticParams() {
  return glossaryTerms.map((term) => ({ term: term.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ term: string }> }): Promise<Metadata> {
  const { term } = await params;
  const entry = glossaryTerms.find((item) => item.slug === term);
  if (!entry) return { title: "Term hittades inte" };
  return { title: `${entry.term} – Ordlista`, description: entry.definition.slice(0, 160) };
}

export default async function TermPage({ params }: { params: Promise<{ term: string }> }) {
  const { term } = await params;
  const entry = glossaryTerms.find((item) => item.slug === term);

  if (!entry) {
    notFound();
  }

  return (
    <article className="card max-w-4xl">
      <Link href="/ordlista" className="text-sm text-[var(--accent)] hover:underline">← Ordlista</Link>
      <h1 className="mt-3 text-4xl">{entry.term}</h1>
      <p className="mt-4 text-lg text-[var(--muted)]">{entry.definition}</p>
      <h2 className="mt-8 text-2xl">Varför spelar det roll?</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--ink)]">{entry.whyItMatters}</p>
    </article>
  );
}
