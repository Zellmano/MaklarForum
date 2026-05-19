import { RegisterAgentForm } from "@/components/register-agent-form";

export default function RegisterAgentPage() {
  return (
    <div className="mx-auto max-w-lg">
      <div className="card">
        <h1 className="text-3xl">Registrera mäklarprofil</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Endast företagsmail tillåts. Profilen granskas manuellt innan aktivering.
        </p>
        <RegisterAgentForm />
      </div>
    </div>
  );
}
