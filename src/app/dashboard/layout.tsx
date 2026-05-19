import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

const tabs = [
  { href: "/dashboard", label: "Översikt" },
  { href: "/dashboard/grupper", label: "Grupper" },
  { href: "/dashboard/fragor", label: "Frågor" },
  { href: "/dashboard/medlemmar", label: "Mäklare" },
  { href: "/dashboard/messages", label: "Meddelanden" },
  { href: "/dashboard/profil", label: "Min profil" },
];

export default async function AgentDashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user || user.role !== "agent") {
    return <>{children}</>;
  }

  return (
    <div>
      <nav className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link key={tab.href} href={tab.href} className="pill pill-light">
            {tab.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
