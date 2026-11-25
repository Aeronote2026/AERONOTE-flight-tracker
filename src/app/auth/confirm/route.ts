import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const EMAIL_TYPES: EmailOtpType[] = ["signup", "email", "recovery", "invite", "email_change"];

/**
 * The link in the confirmation email lands here. Two link styles are
 * accepted:
 *  - ?token_hash=...&type=email  (works on any device or browser)
 *  - ?code=...                   (works in the browser used to register)
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const fail = NextResponse.redirect(new URL("/auth/error", url));
  if (!isSupabaseConfigured) return fail;

  const supabase = await createClient();
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");

  if (tokenHash && type && EMAIL_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(new URL("/logbook", url));
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/logbook", url));
  }
  return fail;
}
