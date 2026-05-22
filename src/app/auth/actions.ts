"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toSlug } from "@/lib/format";

const blockedPersonalDomains = new Set([
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "yahoo.com",
  "live.com",
]);

export async function loginAction(_: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const next = String(formData.get("next") ?? "/dashboard");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  if (next === "/" || !next) {
    const { data: authData } = await supabase.auth.getUser();
    if (authData.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (profile?.role === "admin") {
        redirect("/admin");
      }
    }
    redirect("/dashboard");
  }

  redirect(next);
}

export async function registerAgentAction(_: { error?: string } | undefined, formData: FormData) {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const firm = String(formData.get("firm") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const inviteToken = String(formData.get("invite_token") ?? "").trim();

  const domain = email.split("@")[1] ?? "";
  if (!domain || blockedPersonalDomains.has(domain)) {
    return { error: "Du måste registrera dig med din företagsmail (inte gmail/hotmail/outlook etc.)." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: "agent",
        full_name: fullName,
        firm,
        city,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    const slug = toSlug(`${fullName}-${city}`);

    await supabase.from("profiles").upsert({
      id: data.user.id,
      role: "agent",
      full_name: fullName,
      email,
      firm,
      city,
      verification_status: "pending",
      profile_slug: slug,
      accepted_terms_at: new Date().toISOString(),
    });

    if (inviteToken) {
      await supabase
        .from("invitations")
        .update({
          status: "registered",
          registered_user_id: data.user.id,
          registered_at: new Date().toISOString(),
        })
        .eq("token", inviteToken)
        .eq("status", "pending");
    }
  }

  redirect("/onboarding");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
