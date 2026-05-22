import { RegisterAgentForm } from "@/components/register-agent-form";

export default async function RegisterAgentPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;

  return (
    <div className="mx-auto max-w-lg">
      <div className="card">
        <h1 className="text-3xl">Registrera mäklarprofil</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Endast företagsmail tillåts. Profilen granskas manuellt innan aktivering.
        </p>
        {ref && (
          <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800">
            Du har blivit inbjuden av en kollega! Fyll i formuläret för att skapa ditt konto.
          </p>
        )}
        <RegisterAgentForm inviteToken={ref} />
      </div>
    </div>
  );
}
