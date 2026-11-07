import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OutfitForm } from "./outfit-form";

export const dynamic = "force-dynamic";

export default async function NewOutfitPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?message=" + encodeURIComponent("ログインしてください。"));
  }

  const { data: items, error } = await supabase
    .from("items")
    .select("id, name, category, image_url")
    .order("created_at", { ascending: false });
  const { data: templateData, error: templatesError } = await supabase
    .from("outfit_templates")
    .select(
      "id, name, memo, image_url, outfit_template_items(item:items(id, name, category, image_url))",
    )
    .order("created_at", { ascending: false });
  const templates =
    templateData?.map((template) => ({
      id: template.id,
      name: template.name,
      memo: template.memo,
      imageUrl: template.image_url,
      items: template.outfit_template_items.flatMap(({ item }) =>
        Array.isArray(item) ? item : item ? [item] : [],
      ),
    })) ?? [];

  return (
    <main className="min-h-screen">
      <header className="border-b border-[#e7ebe7] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage font-semibold text-forest">
              W
            </span>
            <span className="font-semibold tracking-wide text-forest">
              WEARLOG
            </span>
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition hover:bg-sage hover:text-forest"
          >
            クローゼットに戻る
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <p className="text-sm font-semibold tracking-wide text-forest">
          OUTFIT JOURNAL
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          今日のコーデを記録
        </h1>
        <p className="mt-3 text-muted">
          日付やメモ、着用したアイテムを記録しましょう。
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            アイテムを読み込めませんでした: {error.message}
          </p>
        ) : (
          <>
            {templatesError && (
              <p
                role="alert"
                className="mt-8 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800"
              >
                テンプレートを読み込めませんでした: {templatesError.message}
                。機能を有効にするには、Supabase SQL Editorで
                `supabase/outfits.sql`を再実行してください。
              </p>
            )}
            <OutfitForm items={items ?? []} templates={templates} />
          </>
        )}
      </section>
    </main>
  );
}
