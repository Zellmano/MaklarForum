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
  const portal = String(formData.get("portal") ?? "agent");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  const { data: authData } = await supabase.auth.getUser();
  const profile = authData.user
    ? (
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", authData.user.id)
          .maybeSingle()
      ).data
    : null;

  if (portal === "agent" && profile?.role !== "agent" && profile?.role !== "admin") {
    await supabase.auth.signOut();
    return { error: "Detta konto är inte registrerat som mäklare. Kontakta admin om du tror att detta är ett misstag." };
  }

  const role = profile?.role ?? "agent";
  const roleHome = role === "admin" ? "/admin" : "/dashboard";

  const isSafeNext = typeof next === "string" && next.startsWith("/");
  if (!isSafeNext || next === "/") {
    redirect(roleHome);
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

    const { error: profileError } = await supabase.from("profiles").upsert({
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

    if (profileError) {
      try {
        const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
        const admin = createSupabaseAdminClient();
        await admin.auth.admin.deleteUser(data.user.id);
      } catch {
        // If cleanup also fails, the auth user is orphaned; getCurrentUser will
        // refuse to mint a profile, so the account is effectively dead. Admin
        // can clean it up manually.
      }
      return { error: `Kunde inte skapa profil: ${profileError.message}` };
    }

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

export async function requestPasswordResetAction(
  _: { error?: string; success?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return { error: "Ange en giltig e-postadress." };
  }

  const supabase = await createSupabaseServerClient();
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success:
      "Om kontot finns har vi skickat en länk till din e-post. Klicka på länken för att välja nytt lösenord.",
  };
}

export async function updatePasswordAction(
  _: { error?: string; success?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { error: "Lösenordet måste vara minst 8 tecken." };
  }
  if (password !== confirm) {
    return { error: "Lösenorden matchar inte." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Din återställningslänk har gått ut. Begär en ny." };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}
