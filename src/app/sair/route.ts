import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Dedicated logout route. Intentionally never referenced via <Link> (Next.js
 * prefetches links in the viewport, which would log the user out just by
 * scrolling past one) — buttons in the UI use the signOut Server Action
 * (src/lib/actions/auth.ts) via a <form>. This route exists for the
 * explicitly required /sair endpoint and direct navigation.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url));
}
