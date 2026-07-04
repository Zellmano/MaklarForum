import Link from "next/link";
import { getCurrentUser, touchLastSeen } from "@/lib/auth";

const verifiedTabs = [
  { href: "/dashboard", label: "Översikt" },
  { href: "/dashboard/grupper", label: "Grupper" },
  { href: "/dashboard/fragor", label: "Frågor" },
  { href: "/dashboard/forum", label: "Forum" },
  { href: "/dashboard/medlemmar", label: "Mäklare" },
  { href: "/dashboard/messages", label: "Meddelanden" },
  { href: "/dashboard/profil", label: "Min profil" },
];

const pendingTabs = [
  { href: "/dashboard/pending", label: "Status" },
  { href: "/dashboard/grupper", label: "Bläddra grupper" },
  { href: "/dashboard/medlemmar", label: "Mäklare" },
  { href: "/dashboard/profil", label: "Min profil" },
];

export default async function AgentDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user || user.role !== "agent") {
    return <>{children}</>;
  }

  await touchLastSeen(user.id);

  const isVerified = user.verificationStatus === "verified";
  const isSuspended = user.verificationStatus === "suspended";

  return (
    <div>
      <nav className="mb-6 flex flex-wrap gap-2">
        {(isVerified ? verifiedTabs : pendingTabs).map((tab) => (
          <Link key={tab.href} href={tab.href} className="pill pill-light">
            {tab.label}
          </Link>
        ))}
      </nav>
      {!isVerified ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {isSuspended ? (
            <p>
              <strong>Ditt konto är pausat.</strong> Kontakta oss på maklarforum@gmail.com om du tror detta är ett misstag.
            </p>
          ) : (
            <p>
              <strong>Välkommen!</strong> Din profil väntar på admin-godkännande (vanligtvis inom 24 timmar).
              Under tiden kan du bläddra grupper, ansöka om medlemskap och bjuda in kollegor — du
              får full tillgång så snart vi verifierat dig.
            </p>
          )}
        </div>
      ) : null}
      {children}
    </div>
  );
}
