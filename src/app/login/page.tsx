import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <h1 className="text-3xl">Logga in</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          MäklarForum är ett slutet community för verifierade mäklare.
        </p>
        <LoginForm next={next ?? "/dashboard"} portal="agent" />
        <div className="mt-4 text-sm text-[var(--muted)]">
          <p>
            <Link href="/forgot-password" className="text-[var(--accent)]">
              Glömt lösenord?
            </Link>
          </p>
          <p className="mt-2">
            Inget konto än?{" "}
            <Link href="/register" className="text-[var(--accent)]">
              Skapa mäklarkonto
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
