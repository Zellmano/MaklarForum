import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/forgot-password");
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <h1 className="text-3xl">Välj nytt lösenord</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Inloggad som <strong>{user.email}</strong>. Välj ett nytt lösenord nedan.
        </p>
        <ResetPasswordForm />
        <div className="mt-4 text-sm text-[var(--muted)]">
          <Link href="/dashboard" className="text-[var(--accent)]">
            Avbryt och gå till dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
