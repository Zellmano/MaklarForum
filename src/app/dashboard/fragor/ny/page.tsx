import { QuestionCreateForm } from "@/components/question-create-form";
import { requireVerifiedAgent } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export default async function NewQuestionPage({ searchParams }: { searchParams: Promise<{ group_id?: string }> }) {
  await requireVerifiedAgent("/dashboard/fragor/ny");
  const { group_id } = await searchParams;

  let groupName: string | undefined;
  if (group_id && hasSupabaseEnv()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("agent_groups")
      .select("name")
      .eq("id", group_id)
      .maybeSingle();
    groupName = data?.name ?? undefined;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="card">
        <h1 className="text-3xl">Ställ en fråga</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Frågor är synliga för alla verifierade mäklare. Geo-filtrerade frågor visas främst för mäklare i ditt område.
        </p>
        <QuestionCreateForm groupId={group_id} groupName={groupName} />
      </div>
    </div>
  );
}
