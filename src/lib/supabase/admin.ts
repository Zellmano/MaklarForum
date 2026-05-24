import { createClient } from "@supabase/supabase-js";
import { supabaseServiceKey, supabaseUrl } from "@/lib/supabase/config";

export function createSupabaseAdminClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase admin client requires SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
