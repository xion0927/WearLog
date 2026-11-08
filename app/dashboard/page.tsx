import { SiteHeader } from "@/app/site-header";
import { OutfitHistory } from "@/app/dashboard/outfit-history";
import { createClient } from "@/lib/supabase/server";
import { removeUnusedImagesForUser } from "@/lib/supabase/image-cleanup";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams: Promise<{ outfitSaved?: string }>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const { outfitSaved } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const imageCleanup = await removeUnusedImagesForUser(user.id);
  return (
    <main className="min-h-screen">
      <SiteHeader currentPage="journal" userEmail={user.email ?? ""} />

      <section className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
        {outfitSaved && (
          <p
            role="status"
            className="mt-5 rounded-xl bg-sage px-4 py-3 text-sm text-forest"
          >
            {outfitSaved}
          </p>
        )}
        {imageCleanup.warning ? (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            未使用画像を整理できませんでした: {imageCleanup.warning}
            Supabase SQL Editorで最新版の `supabase/items.sql` と
            `supabase/outfits.sql` を実行してください。
          </p>
        ) : imageCleanup.removedCount > 0 ? (
          <p
            role="status"
            className="mt-5 rounded-xl bg-sage px-4 py-3 text-sm text-forest"
          >
            どこからも使用されていない画像を
            {imageCleanup.removedCount} 件削除しました。
          </p>
        ) : null}

        <OutfitHistory />
      </section>
    </main>
  );
}
