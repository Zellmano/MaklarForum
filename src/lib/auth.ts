import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { toSlug } from "@/lib/format";
import { UserRole } from "@/lib/types";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  verificationStatus: "pending" | "verified" | "suspended" | null;
}

function normalizeRole(input: unknown): UserRole | null {
  if (input === "agent" || input === "admin" || input === "consumer") {
    return input;
  }
  return null;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return null;
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, verification_status")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!profile) {
    const meta = authData.user.user_metadata ?? {};
    const role = normalizeRole(meta.role);

    if (!role) {
      return null;
    }

    const fullName = String(meta.full_name ?? authData.user.email?.split("@")[0] ?? "Användare").trim();
    const city = String(meta.city ?? "").trim();
    const firm = String(meta.firm ?? "").trim();

    const insertPayload: {
      id: string;
      email: string;
      full_name: string;
      role: UserRole;
      city?: string;
      firm?: string;
      fmi_number?: string;
      verification_status?: "pending" | "verified" | "suspended";
      profile_slug?: string;
      accepted_terms_at?: string;
    } = {
      id: authData.user.id,
      email: authData.user.email ?? "",
      full_name: fullName || "Användare",
      role,
      accepted_terms_at: new Date().toISOString(),
    };

    if (city) insertPayload.city = city;
    if (firm) insertPayload.firm = firm;
    if (meta.fmi_number) insertPayload.fmi_number = String(meta.fmi_number);
    if (role === "agent") {
      insertPayload.verification_status = "pending";
      if (fullName && city) {
        insertPayload.profile_slug = toSlug(`${fullName}-${city}`);
      }
    }

    await supabase.from("profiles").upsert(insertPayload);
    const retry = await supabase
      .from("profiles")
      .select("id, email, full_name, role, verification_status")
      .eq("id", authData.user.id)
      .maybeSingle();
    profile = retry.data ?? null;
  }

  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
    verificationStatus: profile.verification_status ?? null,
  };
}

export async function requireUser(nextPath = "/dashboard") {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return user;
}

export async function requireRole(role: UserRole, nextPath = "/") {
  const user = await requireUser(nextPath);
  if (user.role === "admin") return user;
  if (user.role !== role) {
    redirect("/");
  }
  return user;
}

export async function requireVerifiedAgent(nextPath = "/dashboard") {
  const user = await requireRole("agent", nextPath);
  if (user.role === "admin") return user;
  if (user.verificationStatus === "suspended") {
    redirect("/dashboard/pending?status=suspended");
  }
  if (user.verificationStatus !== "verified") {
    redirect("/dashboard/pending");
  }
  return user;
}
