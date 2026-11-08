import { SiteHeader } from "@/app/site-header";
import { ItemForm } from "@/app/dashboard/item-form";
import { ItemGrid } from "@/app/dashboard/item-grid";
import { TemplateGrid } from "@/app/dashboard/template-grid";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClosetPage() {
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
  const { data: templateData, error: templatesError } = await supabase
    .from("outfit_templates")
    .select(
      "id, name, memo, image_url, created_at, outfit_template_items(item:items(id, name, category, image_url))",
    )
    .order("created_at", { ascending: false });
  const templates =
    templateData?.map((template) => ({
      id: template.id,
      name: template.name,
      memo: template.memo,
      image_url: template.image_url,
      created_at: template.created_at,
      items: template.outfit_template_items.flatMap(({ item }) =>
        Array.isArray(item) ? item : item ? [item] : [],
      ),
    })) ?? [];
  const wardrobeItems = (items ?? []).map(
    ({ id, name, category, image_url }) => ({
      id,
      name,
      category,
      image_url,
    }),
  );

  return (
    <main className="min-h-screen">
      <SiteHeader currentPage="closet" userEmail={user.email ?? ""} />
      <section className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
        <p className="text-sm font-semibold tracking-wide text-forest">
          YOUR WARDROBE
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          クローゼット
        </h1>
        <ItemForm />

        <section className="mt-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">コーデテンプレート</h2>
              <p className="mt-1 text-sm text-muted">
                保存したコーデをいつでも呼び出せます。
              </p>
            </div>
          </div>
          {templatesError ? (
            <p
              role="alert"
              className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800"
            >
              テンプレートを読み込めませんでした: {templatesError.message}
              。Supabase SQL Editorで最新版の
              `supabase/outfits.sql`を実行してください。
            </p>
          ) : (
            <TemplateGrid
              templates={templates}
              wardrobeItems={wardrobeItems}
            />
          )}
        </section>

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
