import { QuestionCreateForm } from "@/components/question-create-form";
import { requireRole } from "@/lib/auth";

export default async function NewQuestionPage() {
  await requireRole("agent", "/dashboard/fragor/ny");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="card">
        <h1 className="text-3xl">Ställ en fråga</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Frågor är synliga för alla verifierade mäklare. Geo-filtrerade frågor visas främst för mäklare i ditt område.
        </p>
        <QuestionCreateForm />
      </div>
    </div>
  );
}
