import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

const tabs = [
  { href: "/dashboard", label: "Översikt" },
  { href: "/dashboard/grupper", label: "Grupper" },
  { href: "/dashboard/fragor", label: "Frågor" },
  { href: "/dashboard/forum", label: "Forum" },
  { href: "/dashboard/medlemmar", label: "Mäklare" },
  { href: "/dashboard/messages", label: "Meddelanden" },
  { href: "/dashboard/profil", label: "Min profil" },
];

export default async function AgentDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user || user.role !== "agent") {
    return <>{children}</>;
  }

  const isVerified = user.verificationStatus === "verified";
  const isSuspended = user.verificationStatus === "suspended";

  return (
    <div>
      {isVerified ? (
        <nav className="mb-6 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Link key={tab.href} href={tab.href} className="pill pill-light">
              {tab.label}
            </Link>
          ))}
        </nav>
      ) : (
        <nav className="mb-6 flex flex-wrap gap-2">
          <Link href="/dashboard/pending" className="pill pill-light">
            Status
          </Link>
          <Link href="/dashboard/profil" className="pill pill-light">
            Min profil
          </Link>
        </nav>
      )}
      {!isVerified ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {isSuspended ? (
            <p>
              <strong>Ditt konto är pausat.</strong> Kontakta support om du tror detta är ett misstag.
            </p>
          ) : (
            <p>
              <strong>Din profil väntar på admin-godkännande.</strong> Du får tillgång till hela
              communityt när vi verifierat att du är aktiv mäklare. Det brukar ta upp till 1–2 vardagar.
            </p>
          )}
        </div>
      ) : null}
      {children}
    </div>
  );
}
