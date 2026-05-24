import { createSupabaseServerClient } from "@/lib/supabase/server";

type RateLimitTable = "forum_posts" | "agent_tips" | "questions" | "answers" | "messages";

interface RateLimitConfig {
  perHour: number;
  perDay: number;
}

const DEFAULTS: Record<RateLimitTable, RateLimitConfig> = {
  forum_posts: { perHour: 10, perDay: 30 },
  agent_tips: { perHour: 10, perDay: 30 },
  questions: { perHour: 10, perDay: 30 },
  answers: { perHour: 30, perDay: 100 },
  messages: { perHour: 60, perDay: 200 },
};

const USER_COLUMN: Record<RateLimitTable, string> = {
  forum_posts: "author_id",
  agent_tips: "author_id",
  questions: "asked_by",
  answers: "answered_by",
  messages: "sender_id",
};

export async function checkRateLimit(
  table: RateLimitTable,
  userId: string,
  config?: Partial<RateLimitConfig>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const limits = { ...DEFAULTS[table], ...config };
  const supabase = await createSupabaseServerClient();
  const userColumn = USER_COLUMN[table];

  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  const [{ count: lastHour }, { count: lastDay }] = await Promise.all([
    supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq(userColumn, userId)
      .gte("created_at", oneHourAgo),
    supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq(userColumn, userId)
      .gte("created_at", oneDayAgo),
  ]);

  if ((lastHour ?? 0) >= limits.perHour) {
    return {
      ok: false,
      error: `Du har nått din timgräns (${limits.perHour}/timme). Vänta lite och försök igen.`,
    };
  }

  if ((lastDay ?? 0) >= limits.perDay) {
    return {
      ok: false,
      error: `Du har nått dagsgränsen (${limits.perDay}/dygn). Kom tillbaka i morgon.`,
    };
  }

  return { ok: true };
}
