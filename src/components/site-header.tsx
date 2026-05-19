import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
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
