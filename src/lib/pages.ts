import { createClient } from "@/lib/supabase/server";
import {
  privacyPolicyContent,
  cookiePolicyContent,
  termsOfUseContent,
  deliveryPolicyContent,
  returnsPolicyContent,
} from "@/lib/legal-content";

export interface CustomPageContent {
  title: string;
  content: string;
}

const FALLBACK_CONTENT_BY_SLUG: Record<string, () => string> = {
  "politica-de-privacidade": privacyPolicyContent,
  "politica-de-cookies": cookiePolicyContent,
  "termos-de-uso": termsOfUseContent,
  "politica-de-entrega": deliveryPolicyContent,
  "trocas-e-devolucoes": returnsPolicyContent,
};

function fallbackContentFor(slug: string): string {
  return FALLBACK_CONTENT_BY_SLUG[slug]?.() ?? "Conteúdo ainda não cadastrado para esta página.";
}

/**
 * Legal/info pages (privacy policy, terms, etc.) are stored in the
 * `custom_pages` table so the administrator can edit them without touching
 * code. Falls back to the real starter drafts in src/lib/legal-content.ts —
 * never a generic placeholder — when Supabase isn't configured yet or the
 * page hasn't been created in the database.
 */
export async function getCustomPage(slug: string, fallbackTitle: string): Promise<CustomPageContent> {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("custom_pages")
        .select("title, content")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (data) {
        return { title: data.title, content: data.content ?? fallbackContentFor(slug) };
      }
    } catch {
      // fall through to the starter content below
    }
  }

  return { title: fallbackTitle, content: fallbackContentFor(slug) };
}
