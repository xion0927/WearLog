import { signOut } from "@/app/auth/actions";
import { ItemForm } from "@/app/dashboard/item-form";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const categoryLabels: Record<string, string> = {
  tops: "トップス",
  bottoms: "ボトムス",
  outerwear: "アウター",
  shoes: "シューズ",
  other: "その他",
};

export default async function DashboardPage() {
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

        <ItemForm />

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
          ) : items?.length ? (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-[#e7ebe7] bg-white shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image_url}
                    alt={item.name}
                    loading="lazy"
                    className="aspect-[4/5] w-full bg-sage object-cover"
                  />
                  <div className="p-4">
                    <p className="truncate font-semibold" title={item.name}>
                      {item.name}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {categoryLabels[item.category] ?? item.category}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-[#cbd8ce] bg-white px-6 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sage text-2xl text-forest">
                +
              </div>
              <h3 className="mt-4 font-semibold">まだ服が登録されていません</h3>
              <p className="mt-2 text-sm text-muted">
                上のフォームから最初のアイテムを追加しましょう。
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
