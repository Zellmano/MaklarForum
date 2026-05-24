import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <h1 className="text-3xl">Glömt lösenord</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Ange din e-postadress så skickar vi en länk där du kan välja ett nytt lösenord.
        </p>
        <ForgotPasswordForm />
        <div className="mt-4 text-sm text-[var(--muted)]">
          <Link href="/login" className="text-[var(--accent)]">
            Tillbaka till inloggning
          </Link>
        </div>
      </div>
    </div>
  );
}
