"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Handles Supabase implicit-flow tokens delivered in the URL hash.
 * Magic links and some password-reset emails redirect to the site root
 * with `#access_token=...&type=recovery|magiclink` in the hash.
 * This component picks that up, sets the session, and redirects the user
 * to the right page.
 */
export function AuthHashHandler() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("access_token=")) return;

    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token") ?? "";
    const type = params.get("type");

    if (!accessToken) return;

    // Clear the hash from the URL immediately so it isn't bookmarked / shared
    window.history.replaceState(null, "", window.location.pathname);

    const supabase = createSupabaseBrowserClient();
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          console.error("AuthHashHandler: failed to set session", error);
          router.replace("/login?error=link_invalid");
          return;
        }
        if (type === "recovery") {
          router.replace("/reset-password");
        } else {
          router.replace("/dashboard");
        }
      });
  }, [router]);

  return null;
}
