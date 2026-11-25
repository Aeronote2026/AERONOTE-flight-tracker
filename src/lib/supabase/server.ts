import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  isSupabaseConfigured,
  supabasePublishableKey,
  supabaseUrl,
} from "./config";

/**
 * A Supabase client for one server request (pages, actions, routes).
 * A new client is created for every request and never shared.
 * Every database query runs as the signed-in pilot, so Row Level
 * Security always applies.
 */
export async function createClient() {
  // Read cookies first: this marks the caller as request-time work, so
  // Next.js never tries to run it while building the site.
  const cookieStore = await cookies();
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured (missing environment variables).");
  }

  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a page, where cookies cannot be written.
          // src/proxy.ts refreshes the session on every request instead.
        }
      },
    },
  });
}
