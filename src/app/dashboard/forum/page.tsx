import { requireVerifiedAgent } from "@/lib/auth";
import { getForumPosts } from "@/lib/data";
import { ForumPostForm } from "@/components/forum-post-form";
import { ForumPostCard } from "@/components/forum-post-card";
import type { ForumCategory } from "@/lib/types";

const CATEGORY_LABELS: Record<ForumCategory, string> = {
  juridik: "Juridik",
  budgivning: "Budgivning",
  teknik: "Teknik & verktyg",
  rekrytering: "Rekrytering",
  allmant: "Allmänt",
};

export default async function ForumPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string }>;
}) {
  const user = await requireVerifiedAgent("/dashboard/forum");
  const params = await searchParams;
  const posts = await getForumPosts();

  const activeCategory = (params.kategori ?? "alla") as ForumCategory | "alla";
  const filtered =
    activeCategory === "alla" ? posts : posts.filter((p) => p.category === activeCategory);

  const categories: Array<ForumCategory | "alla"> = [
    "alla",
    "juridik",
    "budgivning",
    "teknik",
    "rekrytering",
    "allmant",
  ];

  const isAdmin = user.role === "admin";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-4xl">Forum</h1>
          <p className="mt-2 max-w-3xl text-[var(--muted)]">
            Internt forum för mäklare. Diskutera juridik, teknik, rekrytering eller annat — utan brus från
            konsumenter.
          </p>
        </div>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2">
        {categories.map((cat) => {
          const label = cat === "alla" ? "Alla" : CATEGORY_LABELS[cat];
          const href = cat === "alla" ? "/dashboard/forum" : `/dashboard/forum?kategori=${cat}`;
          const isActive = activeCategory === cat;
          return (
            <a
              key={cat}
              href={href}
              className={`pill ${isActive ? "pill-dark" : "pill-light"}`}
            >
              {label}
            </a>
          );
        })}
      </nav>

      <section className="mt-6 card">
        <h2 className="text-xl">Nytt inlägg</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Publiceras direkt i forumet. Synligt för alla verifierade mäklare.
        </p>
        <div className="mt-4">
          <ForumPostForm defaultCategory={activeCategory === "alla" ? "allmant" : activeCategory} />
        </div>
      </section>

      <section className="mt-6 space-y-3">
        {filtered.length === 0 ? (
          <div className="card">
            <p className="text-sm text-[var(--muted)]">Inga inlägg i denna kategori ännu.</p>
          </div>
        ) : null}
        {filtered.map((post) => (
          <ForumPostCard
            key={post.id}
            post={post}
            canManage={isAdmin || post.authorId === user.id}
          />
        ))}
      </section>
    </div>
  );
}
