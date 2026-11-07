"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const categories = [
  { value: "all", label: "すべて" },
  { value: "tops", label: "トップス" },
  { value: "bottoms", label: "ボトムス" },
  { value: "outerwear", label: "アウター" },
  { value: "shoes", label: "シューズ" },
  { value: "other", label: "その他" },
] as const;

const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const maxImageSize = 5 * 1024 * 1024;
const fieldClassName =
  "mt-2 w-full rounded-xl border border-[#dce3dd] bg-white px-4 py-3 text-ink outline-none transition placeholder:text-[#a0aaa3] focus:border-forest focus:ring-4 focus:ring-sage";

type WardrobeItem = {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
};

type OutfitTemplate = {
  id: string;
  name: string;
  memo: string | null;
  imageUrl: string | null;
  items: WardrobeItem[];
};

type OutfitFormProps = {
  items: WardrobeItem[];
  templates: OutfitTemplate[];
};

function getLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function OutfitForm({ items, templates }: OutfitFormProps) {
  const router = useRouter();
  const [date, setDate] = useState(getLocalDate);
  const [saveMode, setSaveMode] = useState<"new" | "template">("new");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [memo, setMemo] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const visibleItems =
    selectedCategory === "all"
      ? items
      : items.filter((item) => item.category === selectedCategory);
  const selectedTemplate = templates.find(
    (template) => template.id === selectedTemplateId,
  );

  function chooseSaveMode(mode: "new" | "template") {
    setSaveMode(mode);
    setSelectedTemplateId("");
    setMemo("");
    setSelectedItemIds([]);
  }

  function chooseTemplate(templateId: string) {
    const template = templates.find((candidate) => candidate.id === templateId);
    setSelectedTemplateId(templateId);
    setMemo(template?.memo ?? "");
    setSelectedItemIds(
      template?.items
        .filter((templateItem) =>
          items.some((item) => item.id === templateItem.id),
        )
        .map((item) => item.id) ?? [],
    );
  }

  function toggleItem(itemId: string) {
    setSelectedItemIds((selected) =>
      selected.includes(itemId)
        ? selected.filter((id) => id !== itemId)
        : [...selected, itemId],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    const form = event.currentTarget;
    if (!date) {
      setErrorMessage("日付を選択してください。");
      return;
    }
    if (saveMode === "template" && !selectedTemplate) {
      setErrorMessage("使用するテンプレートを選択してください。");
      return;
    }

    const formData = new FormData(form);
    const imageEntry = formData.get("image");
    const image =
      imageEntry instanceof File && imageEntry.size > 0 ? imageEntry : null;
    const extension = image ? imageExtensions[image.type] : undefined;

    if (image && !extension) {
      setErrorMessage("JPEG、PNG、WebP、GIF形式の画像を選択してください。");
      return;
    }
    if (image && image.size > maxImageSize) {
      setErrorMessage("画像サイズは5MB以下にしてください。");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage(
        userError
          ? `ログイン状態を確認できませんでした: ${userError.message}`
          : "ログインしてください。",
      );
      setIsSubmitting(false);
      return;
    }

    let imagePath: string | null = null;
    let imageUrl: string | null = null;

    if (image && extension) {
      imagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("outfit-images")
        .upload(imagePath, image, {
          contentType: image.type,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        setErrorMessage(
          `コーデ画像をアップロードできませんでした: ${uploadError.message}`,
        );
        setIsSubmitting(false);
        return;
      }

      imageUrl = supabase.storage
        .from("outfit-images")
        .getPublicUrl(imagePath).data.publicUrl;
    }

    const { error: saveError } = await supabase.rpc("save_outfit", {
      p_date: date,
      p_memo: memo.trim() || null,
      p_image_url: imageUrl ?? selectedTemplate?.imageUrl ?? null,
      p_item_ids: selectedItemIds,
    });

    if (saveError) {
      const cleanupError = imagePath
        ? (
            await supabase.storage
              .from("outfit-images")
              .remove([imagePath])
          ).error
        : null;
      const cleanupMessage = cleanupError
        ? ` 画像の後片付けにも失敗しました: ${cleanupError.message}`
        : "";
      setErrorMessage(
        `コーデを保存できませんでした: ${saveError.message}${cleanupMessage}`,
      );
      setIsSubmitting(false);
      return;
    }

    setMemo("");
    setSelectedItemIds([]);
    setDate(getLocalDate());
    form.reset();
    router.push(
      `/dashboard?outfitSaved=${encodeURIComponent(
        `${date}のコーデを上書き保存しました。`,
      )}`,
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 space-y-8 rounded-2xl border border-[#e7ebe7] bg-white p-6 shadow-sm sm:p-8"
    >
      {errorMessage && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </p>
      )}

      <fieldset>
        <legend className="text-sm font-medium">コーデの作成方法</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            aria-pressed={saveMode === "new"}
            onClick={() => chooseSaveMode("new")}
            className={`rounded-xl border px-4 py-3 text-left transition focus:outline-none focus:ring-4 focus:ring-sage ${
              saveMode === "new"
                ? "border-forest bg-sage text-forest"
                : "border-[#dce3dd] bg-white text-muted hover:bg-sage"
            }`}
          >
            <span className="block font-semibold">新規に作成</span>
            <span className="mt-1 block text-sm">アイテムを選んで記録</span>
          </button>
          <button
            type="button"
            aria-pressed={saveMode === "template"}
            onClick={() => chooseSaveMode("template")}
            className={`rounded-xl border px-4 py-3 text-left transition focus:outline-none focus:ring-4 focus:ring-sage ${
              saveMode === "template"
                ? "border-forest bg-sage text-forest"
                : "border-[#dce3dd] bg-white text-muted hover:bg-sage"
            }`}
          >
            <span className="block font-semibold">テンプレートから作成</span>
            <span className="mt-1 block text-sm">
              保存したコーデを呼び出す
            </span>
          </button>
        </div>
      </fieldset>

      {saveMode === "template" && (
        <section>
          <div>
            <h2 className="text-lg font-semibold">使用するテンプレート</h2>
            <p className="mt-1 text-sm text-muted">
              テンプレートを選ぶと、メモに内容が反映されます。
            </p>
          </div>
          {templates.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {templates.map((template) => {
                const isSelected = selectedTemplateId === template.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => chooseTemplate(template.id)}
                    className={`overflow-hidden rounded-2xl border-2 text-left transition focus:outline-none focus:ring-4 focus:ring-sage ${
                      isSelected
                        ? "border-forest bg-sage"
                        : "border-[#e7ebe7] bg-white hover:border-[#b8c9bd]"
                    }`}
                  >
                    {template.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={template.imageUrl}
                        alt=""
                        loading="lazy"
                        className="aspect-[4/3] w-full bg-sage object-cover"
                      />
                    ) : (
                      <span className="flex aspect-[4/3] w-full items-center justify-center bg-sage text-sm text-forest">
                        画像なし
                      </span>
                    )}
                    <span className="block p-3">
                      <span className="block truncate text-sm font-semibold">
                        {template.name}
                      </span>
                      <span className="mt-1 block text-xs text-muted">
                        {template.items.length} 点のアイテム
                      </span>
                      {template.memo && (
                        <span className="mt-2 block line-clamp-2 whitespace-pre-wrap text-xs text-muted">
                          {template.memo}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-[#cbd8ce] px-4 py-5 text-sm text-muted">
              保存済みのテンプレートはありません。コーデ記録の詳細から
              テンプレートを作成できます。
            </p>
          )}
        </section>
      )}

      <label className="block text-sm font-medium">
        日付
        <input
          name="date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          required
          className={fieldClassName}
        />
      </label>

      <label className="block text-sm font-medium">
        メモ
        <textarea
          name="memo"
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
          maxLength={2000}
          rows={4}
          className={fieldClassName}
          placeholder="天気や気分、コーデのポイントなど"
        />
      </label>

      {saveMode === "new" && (
        <label className="block text-sm font-medium">
          コーデ全体の画像
          <input
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="mt-2 block w-full rounded-xl border border-[#dce3dd] bg-white px-3 py-2.5 text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-sage file:px-3 file:py-2 file:font-medium file:text-forest"
          />
        </label>
      )}

      {saveMode === "new" && (
        <section>
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">着用した服</h2>
              <p className="mt-1 text-sm text-muted">
                アイテムをタップして選択・解除できます。
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-sage px-3 py-1 text-sm font-medium text-forest">
              {selectedItemIds.length} 点選択中
            </span>
          </div>

          {items.length > 0 && (
            <div
              className="mt-4 flex flex-wrap gap-2"
              aria-label="カテゴリで絞り込み"
            >
              {categories.map((category) => {
                const isSelected = selectedCategory === category.value;
                const count =
                  category.value === "all"
                    ? items.length
                    : items.filter((item) => item.category === category.value)
                        .length;

                return (
                  <button
                    key={category.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedCategory(category.value)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-4 focus:ring-sage ${
                      isSelected
                        ? "bg-forest text-white"
                        : "border border-[#dce3dd] bg-white text-muted hover:bg-sage hover:text-forest"
                    }`}
                  >
                    {category.label}
                    <span className="ml-1.5 opacity-75">{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {items.length > 0 ? (
            visibleItems.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {visibleItems.map((item) => {
                  const isSelected = selectedItemIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => toggleItem(item.id)}
                      className={`overflow-hidden rounded-2xl border-2 text-left transition focus:outline-none focus:ring-4 focus:ring-sage ${
                        isSelected
                          ? "border-forest bg-sage"
                          : "border-[#e7ebe7] bg-white hover:border-[#b8c9bd]"
                      }`}
                    >
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image_url}
                          alt=""
                          loading="lazy"
                          className="aspect-[4/3] w-full bg-sage object-cover"
                        />
                      ) : (
                        <span className="flex aspect-[4/3] w-full items-center justify-center bg-sage text-sm text-forest">
                          画像なし
                        </span>
                      )}
                      <span className="flex items-center gap-2 p-3">
                        <span
                          aria-hidden="true"
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${
                            isSelected
                              ? "border-forest bg-forest text-white"
                              : "border-[#bdc9c0] bg-white text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">
                            {item.name}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted">
                            {categories.find(
                              (category) => category.value === item.category,
                            )?.label ?? item.category}
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-[#cbd8ce] px-5 py-8 text-center text-sm text-muted">
                このカテゴリにはアイテムがありません。
              </p>
            )
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-[#cbd8ce] px-5 py-8 text-center">
              <p className="text-sm text-muted">
                まだ登録済みの服がありません。
              </p>
              <Link
                href="/dashboard"
                className="mt-3 inline-block font-semibold text-forest hover:underline"
              >
                クローゼットで服を登録する
              </Link>
            </div>
          )}
        </section>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-[#e7ebe7] pt-6 sm:flex-row sm:justify-end">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-xl border border-[#dce3dd] px-5 py-3 font-semibold text-muted transition hover:bg-sage"
        >
          キャンセル
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-forest px-6 py-3 font-semibold text-white transition hover:bg-[#264b39] focus:outline-none focus:ring-4 focus:ring-sage disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "保存中..." : "この日のコーデを保存"}
        </button>
      </div>
    </form>
  );
}
