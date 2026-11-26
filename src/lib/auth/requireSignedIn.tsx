import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/**
 * Server-side session check for private pages (second lock after
 * src/proxy.ts). Same logic the /lab pages used: no verified session →
 * /login. Use inside <Suspense>, since it reads request cookies.
 */
export async function RequireSignedIn({ children }: { children: React.ReactNode }) {
  await cookies(); // request-time only
  if (!isSupabaseConfigured) redirect("/login");
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login");
  return <>{children}</>;
}
