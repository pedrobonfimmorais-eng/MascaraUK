import { createClient } from "@/lib/supabase/server";

export interface CustomPageContent {
  title: string;
  content: string;
}

const fallbackContent =
  "Conteúdo de exemplo. Este texto será substituído pelo conteúdo real cadastrado pelo administrador da loja.";

/**
 * Legal/info pages (privacy policy, terms, etc.) are stored in the
 * `custom_pages` table so the administrator can edit them without touching
 * code. Falls back to placeholder content when Supabase isn't configured
 * yet or the page hasn't been created in the database.
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
        return { title: data.title, content: data.content ?? fallbackContent };
      }
    } catch {
      // fall through to placeholder content below
    }
  }

  return { title: fallbackTitle, content: fallbackContent };
}
