"use client";

import { useActionState } from "react";
import { createForumPostAction } from "@/app/dashboard/forum/actions";
import type { ForumCategory } from "@/lib/types";

const CATEGORIES: Array<{ value: ForumCategory; label: string }> = [
  { value: "allmant", label: "Allmänt" },
  { value: "juridik", label: "Juridik" },
  { value: "budgivning", label: "Budgivning" },
  { value: "teknik", label: "Teknik & verktyg" },
  { value: "rekrytering", label: "Rekrytering" },
];

export function ForumPostForm({ defaultCategory = "allmant" }: { defaultCategory?: ForumCategory }) {
  const [state, action, pending] = useActionState(createForumPostAction, undefined);

  return (
    <form action={action} className="grid gap-3 text-sm">
      <label>
        Rubrik
        <input
          name="title"
          required
          minLength={3}
          maxLength={200}
          className="mt-1 w-full rounded-xl border border-[var(--line)] p-2"
          placeholder="Ex: Ny tolkning av tillträdesavtalet?"
        />
      </label>
      <label>
        Inlägg
        <textarea
          name="body"
          required
          minLength={10}
          maxLength={10000}
          className="mt-1 min-h-32 w-full rounded-xl border border-[var(--line)] p-2"
        />
      </label>
      <label>
        Kategori
        <select
          name="category"
          defaultValue={defaultCategory}
          className="mt-1 w-full rounded-xl border border-[var(--line)] p-2"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </label>
      {state?.error ? <p className="text-red-700">{state.error}</p> : null}
      {state?.success ? <p className="text-emerald-700">{state.success}</p> : null}
      <button className="pill pill-dark w-fit" disabled={pending}>
        {pending ? "Publicerar..." : "Publicera inlägg"}
      </button>
    </form>
  );
}
