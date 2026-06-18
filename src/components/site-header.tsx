import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/auth/actions";

const adminNav = [{ href: "/admin", label: "Admin" }];
const roleLabel: Record<"consumer" | "agent" | "admin", string> = {
  consumer: "Konsument",
  agent: "Mäklare",
  admin: "Admin",
};

export async function SiteHeader() {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "admin";

  let unreadNotifications = 0;
  if (user) {
    const supabase = await createSupabaseServerClient();
    const { count } = await supabase
      .from("app_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null);
    unreadNotifications = count ?? 0;
  }

  return (
    <header className="sticky top-0 z-20 border-b border-white/40 bg-[rgba(243,241,236,0.92)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight text-[var(--ink)]">
          MäklarForum
        </Link>
        <nav className="hidden gap-4 text-sm md:flex">
          {user ? (
            <Link href="/dashboard" className="nav-link">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/priser" className="nav-link">Priser</Link>
              <Link href="/villkor" className="nav-link">Villkor</Link>
            </>
          )}
          {isAdmin
            ? adminNav.map((item) => (
                <Link key={item.href} href={item.href} className="nav-link">
                  {item.label}
                </Link>
              ))
            : null}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/dashboard/notiser"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-white hover:border-[var(--accent)]"
                aria-label={`Notiser${unreadNotifications > 0 ? ` (${unreadNotifications} olästa)` : ""}`}
                title="Notiser"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                {unreadNotifications > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-semibold leading-4 text-white">
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </Link>
              <span className="hidden text-xs text-[var(--muted)] sm:inline">{user.fullName}</span>
              <span className="pill pill-light">{roleLabel[user.role]}</span>
              <form action={signOutAction}>
                <button className="pill pill-dark">Logga ut</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="pill pill-light">
                Logga in
              </Link>
              <Link href="/register" className="pill pill-dark">
                Skapa mäklarkonto
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
