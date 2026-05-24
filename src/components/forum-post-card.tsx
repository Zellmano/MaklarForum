"use client";

import { useState, useTransition } from "react";
import { UserAvatar } from "@/components/user-avatar";
import { deleteForumPostAction, updateForumPostAction } from "@/app/dashboard/forum/actions";
import type { ForumCategory, ForumPost } from "@/lib/types";

const CATEGORY_LABELS: Record<ForumCategory, string> = {
  juridik: "Juridik",
  budgivning: "Budgivning",
  teknik: "Teknik & verktyg",
  rekrytering: "Rekrytering",
  allmant: "Allmänt",
};

const CATEGORIES: Array<{ value: ForumCategory; label: string }> = [
  { value: "allmant", label: "Allmänt" },
  { value: "juridik", label: "Juridik" },
  { value: "budgivning", label: "Budgivning" },
  { value: "teknik", label: "Teknik & verktyg" },
  { value: "rekrytering", label: "Rekrytering" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ForumPostCard({ post, canManage }: { post: ForumPost; canManage: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleUpdate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await updateForumPostAction(post.id, formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setIsEditing(false);
      }
    });
  }

  function handleDelete() {
    if (!confirm("Vill du radera detta inlägg? Det går inte att ångra.")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteForumPostAction(post.id);
      if (res?.error) {
        setError(res.error);
      }
    });
  }

  return (
    <article className="card">
      <div className="flex items-start gap-3">
        <UserAvatar url={post.authorAvatarUrl} name={post.authorName} />
        <div className="flex-1">
          {isEditing ? (
            <form action={handleUpdate} className="grid gap-2 text-sm">
              <input
                name="title"
                defaultValue={post.title}
                required
                minLength={3}
                maxLength={200}
                className="w-full rounded-xl border border-[var(--line)] p-2"
              />
              <textarea
                name="body"
                defaultValue={post.body}
                required
                minLength={10}
                maxLength={10000}
                className="min-h-32 w-full rounded-xl border border-[var(--line)] p-2"
              />
              <select
                name="category"
                defaultValue={post.category}
                className="w-full rounded-xl border border-[var(--line)] p-2"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              {error ? <p className="text-red-700">{error}</p> : null}
              <div className="flex gap-2">
                <button type="submit" className="pill pill-dark" disabled={isPending}>
                  {isPending ? "Sparar..." : "Spara"}
                </button>
                <button
                  type="button"
                  className="pill pill-light"
                  onClick={() => {
                    setIsEditing(false);
                    setError(null);
                  }}
                  disabled={isPending}
                >
                  Avbryt
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{post.title}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {post.authorName} • {formatDate(post.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="pill pill-light">{CATEGORY_LABELS[post.category]}</span>
                  {post.isRecruiting ? <span className="pill pill-dark">Rekrytering</span> : null}
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm">{post.body}</p>
              {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
              <div className="mt-3 flex items-center justify-between">
                {post.replyCount > 0 ? (
                  <p className="text-xs text-[var(--muted)]">{post.replyCount} svar</p>
                ) : (
                  <span />
                )}
                {canManage ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-xs text-[var(--muted)] hover:underline"
                      onClick={() => setIsEditing(true)}
                      disabled={isPending}
                    >
                      Redigera
                    </button>
                    <button
                      type="button"
                      className="text-xs text-red-700 hover:underline"
                      onClick={handleDelete}
                      disabled={isPending}
                    >
                      Radera
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
