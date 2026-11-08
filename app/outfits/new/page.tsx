import { redirect } from "next/navigation";
import { SiteHeader } from "@/app/site-header";
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
      <SiteHeader currentPage="record" userEmail={user.email ?? ""} />

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
