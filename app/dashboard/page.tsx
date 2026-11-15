import { SiteHeader } from "@/app/site-header";
import { OutfitHistory } from "@/app/dashboard/outfit-history";
import {
  MonthlyOutfitRanking,
  type MonthlyOutfitRankingItem,
} from "@/app/dashboard/monthly-outfit-ranking";
import { createClient } from "@/lib/supabase/server";
import { removeUnusedImagesForUser } from "@/lib/supabase/image-cleanup";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams: Promise<{ outfitSaved?: string }>;
};

function getWearMonthNumber(value: number | string) {
  const month =
    typeof value === "number" ? value : Number(value.slice(5, 7));
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : null;
}

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

  const [imageCleanup, templateRankingResult] = await Promise.all([
    removeUnusedImagesForUser(user.id),
    supabase
      .from("outfit_templates")
      .select(
        "id, name, memo, image_url, outfit_template_items(item:items(id, name, category, image_url)), outfit_template_wears(wear_month), outfit_template_manual_months(wear_month)",
      ),
  ]);
  const rankings: Record<number, MonthlyOutfitRankingItem[]> = {};
  for (let month = 1; month <= 12; month += 1) {
    rankings[month] = (templateRankingResult.data ?? [])
      .flatMap((template) => {
        const recordedCount = template.outfit_template_wears.reduce(
          (count, { wear_month }) =>
            count + (getWearMonthNumber(wear_month) === month ? 1 : 0),
          0,
        );
        const hasManualTag = template.outfit_template_manual_months.some(
          ({ wear_month }) => getWearMonthNumber(wear_month) === month,
        );
        if (recordedCount === 0 && !hasManualTag) {
          return [];
        }

        return [
          {
            id: template.id,
            name: template.name,
            imageUrl: template.image_url,
            memo: template.memo,
            wearCount: Math.max(recordedCount, hasManualTag ? 1 : 0),
            countIsMinimum: hasManualTag,
            items: template.outfit_template_items.flatMap(({ item }) =>
              (Array.isArray(item) ? item : item ? [item] : []).map(
                ({ id, name, category, image_url }) => ({
                  id,
                  name,
                  category,
                  imageUrl: image_url,
                }),
              ),
            ),
          },
        ];
      })
      .sort(
        (a, b) =>
          a.wearCount - b.wearCount || a.name.localeCompare(b.name, "ja"),
      );
  }
  const templateRankingError = templateRankingResult.error?.message;

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

        <MonthlyOutfitRanking
          rankings={rankings}
          errorMessage={templateRankingError}
        />
        <OutfitHistory />
      </section>
    </main>
  );
}
