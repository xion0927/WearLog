import { signOut } from "@/app/auth/actions";
import Link from "next/link";
import { ItemForm } from "@/app/dashboard/item-form";
import { ItemGrid } from "@/app/dashboard/item-grid";
import { OutfitHistory } from "@/app/dashboard/outfit-history";
import { createClient } from "@/lib/supabase/server";

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

  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("id, name, category, image_url, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen">
      <header className="border-b border-[#e7ebe7] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage font-semibold text-forest">
              W
            </div>
            <span className="font-semibold tracking-wide text-forest">WEARLOG</span>
          </div>
          <form action={signOut}>
            <button className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition hover:bg-sage hover:text-forest">
              ログアウト
            </button>
          </form>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
        <p className="text-sm font-semibold tracking-wide text-forest">
          YOUR WARDROBE
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          マイクローゼット
        </h1>
        <p className="mt-3 text-muted">{user.email} でログイン中</p>

        {outfitSaved && (
          <p
            role="status"
            className="mt-5 rounded-xl bg-sage px-4 py-3 text-sm text-forest"
          >
            {outfitSaved}
          </p>
        )}

        <div className="mt-8">
          <Link
            href="/outfits/new"
            className="inline-flex items-center justify-center rounded-xl bg-forest px-5 py-3 font-semibold text-white transition hover:bg-[#264b39] focus:outline-none focus:ring-4 focus:ring-sage"
          >
            今日のコーデを記録する
          </Link>
          <Link
            href="#outfit-history"
            className="ml-3 inline-flex items-center justify-center rounded-xl border border-[#dce3dd] bg-white px-5 py-3 font-semibold text-forest transition hover:bg-sage focus:outline-none focus:ring-4 focus:ring-sage"
          >
            コーデの記録を見る
          </Link>
        </div>

        <ItemForm />

        <OutfitHistory />

        <section className="mt-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">登録した服</h2>
              <p className="mt-1 text-sm text-muted">
                {items?.length ?? 0} アイテム
              </p>
            </div>
          </div>

          {itemsError ? (
            <p
              role="alert"
              className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              服の一覧を読み込めませんでした: {itemsError.message}
            </p>
          ) : (
            <ItemGrid items={items ?? []} />
          )}
        </section>
      </section>
    </main>
  );
}
