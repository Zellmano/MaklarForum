import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface PublicGroupPreview {
  slug: string;
  name: string;
  municipality: string | null;
  region: string | null;
  memberCount: number;
}

export interface PublicPollPreview {
  id: string;
  title: string;
  description: string | null;
  options: Array<{ label: string; votes: number }>;
  totalVotes: number;
  closesAt: string | null;
  groupName: string;
}

const DEFAULT_GROUP_SLUG = "sveriges-fastighetsmaklare";

export async function getPublicGroupPreviews(limit = 6): Promise<PublicGroupPreview[]> {
  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return [];
  }

  const { data: groups } = await admin
    .from("agent_groups")
    .select("id, slug, name, municipality, region")
    .eq("status", "approved")
    .limit(limit * 3);

  if (!groups || groups.length === 0) return [];

  const { data: memberRows } = await admin
    .from("agent_group_members")
    .select("group_id")
    .in(
      "group_id",
      groups.map((g) => g.id),
    );

  const counts = new Map<string, number>();
  for (const row of memberRows ?? []) {
    counts.set(row.group_id, (counts.get(row.group_id) ?? 0) + 1);
  }

  return groups
    .map((g) => ({
      slug: g.slug,
      name: g.name,
      municipality: g.municipality,
      region: g.region,
      memberCount: counts.get(g.id) ?? 0,
    }))
    .sort((a, b) => b.memberCount - a.memberCount)
    .slice(0, limit);
}

export async function getPublicDefaultGroupPolls(limit = 2): Promise<PublicPollPreview[]> {
  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return [];
  }

  const { data: group } = await admin
    .from("agent_groups")
    .select("id, name")
    .eq("slug", DEFAULT_GROUP_SLUG)
    .maybeSingle();

  if (!group) return [];

  const { data: polls } = await admin
    .from("group_polls")
    .select("id, title, description, options, closes_at")
    .eq("group_id", group.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!polls || polls.length === 0) return [];

  const { data: votes } = await admin
    .from("group_poll_votes")
    .select("poll_id, option_index")
    .in(
      "poll_id",
      polls.map((p) => p.id),
    );

  const voteTally = new Map<string, Map<number, number>>();
  for (const v of votes ?? []) {
    const inner = voteTally.get(v.poll_id) ?? new Map<number, number>();
    inner.set(v.option_index, (inner.get(v.option_index) ?? 0) + 1);
    voteTally.set(v.poll_id, inner);
  }

  return polls.map((p) => {
    const options = Array.isArray(p.options) ? (p.options as Array<{ label?: string } | string>) : [];
    const tally = voteTally.get(p.id) ?? new Map<number, number>();
    const optionResults = options.map((opt, idx) => ({
      label: typeof opt === "string" ? opt : (opt.label ?? `Alternativ ${idx + 1}`),
      votes: tally.get(idx) ?? 0,
    }));
    const totalVotes = optionResults.reduce((acc, o) => acc + o.votes, 0);
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      options: optionResults,
      totalVotes,
      closesAt: p.closes_at,
      groupName: group.name,
    };
  });
}
