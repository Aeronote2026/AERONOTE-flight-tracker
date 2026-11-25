/**
 * Public Supabase settings, read from Vercel's environment variables.
 * Only the PUBLISHABLE key is ever used in AERONOTE. The secret key is
 * never placed in the code or in Vercel.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const isSupabaseConfigured =
  supabaseUrl.startsWith("https://") && supabasePublishableKey.length > 0;
