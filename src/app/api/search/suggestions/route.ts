import { NextResponse } from "next/server";
import { getSearchSuggestions } from "@/lib/catalog";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";

  const suggestions = await getSearchSuggestions(query);
  return NextResponse.json({ items: suggestions });
}
