"use server";

import { removeImageIfUnused } from "@/lib/supabase/image-cleanup";

export async function cleanupUnusedImage(
  imageUrl: string | null,
): Promise<{ warning?: string }> {
  const { warning } = await removeImageIfUnused(imageUrl);
  return warning ? { warning } : {};
}
