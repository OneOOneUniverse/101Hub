import "server-only";

import { supabaseAdmin } from "@/lib/supabase";
import type { SiteContent } from "@/lib/site-content-types";

const CONTENT_ID = "default";

export async function getSiteContentFromDb(): Promise<SiteContent | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("site_content")
      .select("data")
      .eq("id", CONTENT_ID)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows found - this is expected on first run
        return null;
      }
      console.error("Supabase fetch error:", error);
      return null;
    }

    return (data?.data as SiteContent) || null;
  } catch (error) {
    console.error("Error fetching site content from DB:", error);
    return null;
  }
}

export async function saveSiteContentToDb(content: SiteContent): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from("site_content")
      .upsert(
        {
          id: CONTENT_ID,
          data: content,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        }
      );

    if (error) {
      throw new Error(`Supabase save error: ${error.message}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to save site content to database: ${message}`);
  }
}
