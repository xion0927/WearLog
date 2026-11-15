"use client";

import { useState, type FormEvent } from "react";
import { cleanupUnusedImage } from "@/app/image-actions";
import { createClient } from "@/lib/supabase/client";

type TemplateItem = {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
};

type OutfitTemplate = {
  id: string;
  name: string;
  memo: string | null;
  image_url: string | null;
  created_at: string;
  wear_months: number[];
  manual_wear_months: number[];
  items: TemplateItem[];
};

type TemplateGridProps = {
  templates: OutfitTemplate[];
  wardrobeItems: TemplateItem[];
};

const categories: Record<string, string> = {
  tops: "トップス",
  bottoms: "ボトムス",
  outerwear: "アウター",
  shoes: "シューズ",
  other: "その他",
};

const categoryFilters = [
  { value: "all", label: "すべて" },
  { value: "tops", label: "トップス" },
  { value: "bottoms", label: "ボトムス" },
  { value: "outerwear", label: "アウター" },
  { value: "shoes", label: "シューズ" },
  { value: "other", label: "その他" },
] as const;

const wearMonthOptions = Array.from({ length: 12 }, (_, index) => index + 1);

const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const maxImageSize = 5 * 1024 * 1024;
const fieldClassName =
  "mt-2 w-full rounded-xl border border-[#dce3dd] bg-white px-4 py-3 text-ink outline-none transition focus:border-forest focus:ring-4 focus:ring-sage";

function formatWearMonth(value: number) {
  return `${value}月`;
}

function getCurrentWearMonth() {
  return new Date().getMonth() + 1;
}

export function TemplateGrid({
  templates: initialTemplates,
  wardrobeItems,
}: TemplateGridProps) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTemplateMonth, setSelectedTemplateMonth] = useState<
    number | "all"
  >("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingWearMonth, setIsUpdatingWearMonth] = useState(false);
  const [removeImage, setRemoveImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [wearMonthError, setWearMonthError] = useState("");
  const [wearMonthFeedback, setWearMonthFeedback] = useState("");
  const [monthToAdd, setMonthToAdd] = useState(getCurrentWearMonth);

  const activeTemplate = templates.find(
    (template) => template.id === activeTemplateId,
  );
  const selectedTemplate = templates.find(
    (template) => template.id === selectedTemplateId,
  );
  const activeRecordedWearMonths = new Set(activeTemplate?.wear_months ?? []);
  const activeManualWearMonths = new Set(
    activeTemplate?.manual_wear_months ?? [],
  );
  const activeDisplayedWearMonths = [
    ...new Set([
      ...activeRecordedWearMonths,
      ...activeManualWearMonths,
    ]),
  ].sort((a, b) => b - a);
  const recordedWearMonths = new Set(selectedTemplate?.wear_months ?? []);
  const manualWearMonths = new Set(
    selectedTemplate?.manual_wear_months ?? [],
  );
  const displayedWearMonths = [
    ...new Set([...recordedWearMonths, ...manualWearMonths]),
  ].sort((a, b) => b - a);
  const visibleWardrobeItems =
    selectedCategory === "all"
      ? wardrobeItems
      : wardrobeItems.filter((item) => item.category === selectedCategory);
  const visibleTemplates =
    selectedTemplateMonth === "all"
      ? templates
      : templates.filter(
          (template) =>
            template.wear_months.includes(selectedTemplateMonth) ||
            template.manual_wear_months.includes(selectedTemplateMonth),
        );

  function openEditor(template: OutfitTemplate) {
    setErrorMessage("");
    setFeedbackMessage("");
    setWearMonthError("");
    setWearMonthFeedback("");
    setMonthToAdd(getCurrentWearMonth());
    setSelectedCategory("all");
    setSelectedItemIds(template.items.map((item) => item.id));
    setRemoveImage(false);
    setSelectedTemplateId(null);
    setActiveTemplateId(template.id);
  }

  async function addManualWearMonth() {
    if (!activeTemplate || !monthToAdd) {
      setWearMonthError("追加する月を選択してください。");
      return;
    }

    setIsUpdatingWearMonth(true);
    setWearMonthError("");
    setWearMonthFeedback("");
    const wearMonth = monthToAdd;
    try {
      const response = await fetch("/api/outfit-templates/wear-months", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: activeTemplate.id,
          month: wearMonth,
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        alreadyExists?: boolean;
      };
      if (!response.ok) {
        throw new Error(result.error ?? "着用月を追加できませんでした。");
      }

      setTemplates((current) =>
        current.map((template) =>
          template.id === activeTemplate.id &&
          !template.manual_wear_months.includes(wearMonth)
            ? {
                ...template,
                manual_wear_months: [
                  ...template.manual_wear_months,
                  wearMonth,
                ],
              }
            : template,
        ),
      );
      setWearMonthFeedback(
        result.alreadyExists
          ? `${formatWearMonth(wearMonth)}は既に手動登録されています。`
          : `${formatWearMonth(wearMonth)}を着用月に追加しました。`,
      );
    } catch (error) {
      setWearMonthError(
        error instanceof Error
          ? error.message
          : "着用月を追加できませんでした。",
      );
    } finally {
      setIsUpdatingWearMonth(false);
    }
  }

  async function removeManualWearMonth(wearMonth: number) {
    if (!activeTemplate) {
      return;
    }

    setIsUpdatingWearMonth(true);
    setWearMonthError("");
    setWearMonthFeedback("");
    try {
      const response = await fetch("/api/outfit-templates/wear-months", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: activeTemplate.id,
          month: wearMonth,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "手動の着用月を解除できませんでした。");
      }

      setTemplates((current) =>
        current.map((template) =>
          template.id === activeTemplate.id
            ? {
                ...template,
                manual_wear_months: template.manual_wear_months.filter(
                  (month) => month !== wearMonth,
                ),
              }
            : template,
        ),
      );
      setWearMonthFeedback(`${formatWearMonth(wearMonth)}の手動登録を解除しました。`);
    } catch (error) {
      setWearMonthError(
        error instanceof Error
          ? error.message
          : "手動の着用月を解除できませんでした。",
      );
    } finally {
      setIsUpdatingWearMonth(false);
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeTemplate) {
      return;
    }

    setErrorMessage("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const memo = String(formData.get("memo") ?? "").trim();
    const imageEntry = formData.get("image");
    const image =
      imageEntry instanceof File && imageEntry.size > 0 ? imageEntry : null;
    const extension = image ? imageExtensions[image.type] : undefined;

    if (!name || name.length > 80) {
      setErrorMessage("テンプレート名は1〜80文字で入力してください。");
      return;
    }
    if (memo.length > 2000) {
      setErrorMessage("メモは2000文字以内で入力してください。");
      return;
    }
    if (image && !extension) {
      setErrorMessage("JPEG、PNG、WebP、GIF形式の画像を選択してください。");
      return;
    }
    if (image && image.size > maxImageSize) {
      setErrorMessage("画像サイズは5MB以下にしてください。");
      return;
    }

    setIsSubmitting(true);
    let imageUrl = removeImage ? null : activeTemplate.image_url;
    let uploadedImagePath: string | null = null;
    const supabase = createClient();

    try {
      if (image && extension) {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          throw new Error(
            userError
              ? `ログイン状態を確認できませんでした: ${userError.message}`
              : "ログインしてください。",
          );
        }
        uploadedImagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("outfit-images")
          .upload(uploadedImagePath, image, {
            contentType: image.type,
            cacheControl: "3600",
            upsert: false,
          });
        if (uploadError) {
          throw new Error(`画像をアップロードできませんでした: ${uploadError.message}`);
        }
        imageUrl = supabase.storage
          .from("outfit-images")
          .getPublicUrl(uploadedImagePath).data.publicUrl;
      }

      const response = await fetch("/api/outfit-templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: activeTemplate.id,
          name,
          memo: memo || null,
          imageUrl,
          itemIds: selectedItemIds,
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        cleanupWarning?: string;
      };
      if (!response.ok) {
        throw new Error(result.error ?? "テンプレートを更新できませんでした。");
      }

      setTemplates((current) =>
        current.map((template) =>
          template.id === activeTemplate.id
            ? {
                ...template,
                name,
                memo: memo || null,
                image_url: imageUrl,
                items: wardrobeItems.filter((item) =>
                  selectedItemIds.includes(item.id),
                ),
              }
            : template,
        ),
      );
      setSelectedItemIds(selectedItemIds);
      setRemoveImage(false);
      setActiveTemplateId(null);
      setFeedbackMessage(
        result.cleanupWarning
          ? `テンプレートを更新しました。${result.cleanupWarning}`
          : "テンプレートを更新しました。",
      );
    } catch (error) {
      let cleanupMessage = "";
      if (uploadedImagePath) {
        const cleanupResult = await cleanupUnusedImage(imageUrl);
        cleanupMessage = cleanupResult.warning
          ? ` ${cleanupResult.warning}`
          : "";
      }
      setErrorMessage(
        `${error instanceof Error ? error.message : "テンプレートを更新できませんでした。"}${cleanupMessage}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(template: OutfitTemplate) {
    if (!window.confirm(`「${template.name}」を削除しますか？`)) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/outfit-templates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: template.id }),
      });
      const result = (await response.json()) as {
        error?: string;
        cleanupWarning?: string;
      };
      if (!response.ok) {
        throw new Error(result.error ?? "テンプレートを削除できませんでした。");
      }
      setTemplates((current) =>
        current.filter((entry) => entry.id !== template.id),
      );
      setActiveTemplateId(null);
      setFeedbackMessage(
        result.cleanupWarning
          ? `テンプレートを削除しました。${result.cleanupWarning}`
          : "テンプレートを削除しました。",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "テンプレートを削除できませんでした。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mt-14">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">コーデテンプレート</h2>
          <p className="mt-1 text-sm text-muted">
            {templates.length} 件
          </p>
        </div>
      </div>

      {feedbackMessage && (
        <p
          role="status"
          className="mt-4 rounded-xl bg-sage px-4 py-3 text-sm text-forest"
        >
          {feedbackMessage}
        </p>
      )}

      {templates.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <label className="text-sm font-medium">
            着用月で絞り込み
            <select
              value={selectedTemplateMonth}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedTemplateMonth(
                  value === "all" ? "all" : Number(value),
                );
              }}
              className="ml-2 rounded-xl border border-[#dce3dd] bg-white px-3 py-2 text-ink outline-none focus:border-forest focus:ring-4 focus:ring-sage"
            >
              <option value="all">すべて</option>
              {wearMonthOptions.map((month) => (
                <option key={month} value={month}>
                  {month}月
                </option>
              ))}
            </select>
          </label>
          <p className="text-sm text-muted">
            {visibleTemplates.length} 件表示
          </p>
        </div>
      )}

      {templates.length ? (
        visibleTemplates.length ? (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {visibleTemplates.map((template) => (
              <article
                key={template.id}
                className="relative overflow-hidden rounded-2xl border border-[#e7ebe7] bg-white shadow-sm"
              >
                <button
                  type="button"
                  aria-label={`${template.name}の詳細を表示`}
                  onClick={() => {
                    setWearMonthError("");
                    setWearMonthFeedback("");
                    setSelectedTemplateId(template.id);
                  }}
                  className="block w-full text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-forest"
                >
                  {template.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={template.image_url}
                      alt={template.name}
                      loading="lazy"
                      className="aspect-[4/5] w-full bg-sage object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/5] items-center justify-center bg-sage text-sm text-forest">
                      画像なし
                    </div>
                  )}
                  <div className="p-4">
                    <p className="truncate font-semibold" title={template.name}>
                      {template.name}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {template.items.length} 点のアイテム
                    </p>
                    <p className="mt-2 text-xs text-forest">タップして詳細</p>
                  </div>
                </button>
                <button
                  type="button"
                  aria-label={`${template.name}を編集`}
                  title="編集・削除"
                  onClick={() => openEditor(template)}
                  className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-xl text-ink shadow-md transition hover:bg-sage focus:outline-none focus:ring-4 focus:ring-sage"
                >
                  ⋮
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-[#cbd8ce] bg-white px-6 py-10 text-center">
            <p className="font-semibold">
              {selectedTemplateMonth}月のタグが付いたテンプレートはありません
            </p>
          </div>
        )
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-[#cbd8ce] bg-white px-6 py-12 text-center">
          <p className="font-semibold">まだテンプレートがありません</p>
          <p className="mt-2 text-sm text-muted">
            コーデを記録するときにテンプレートとして登録できます。
          </p>
        </div>
      )}

      {selectedTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedTemplateId(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-detail-title"
            className="my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold tracking-wide text-forest">
                  OUTFIT TEMPLATE
                </p>
                <h2
                  id="template-detail-title"
                  className="mt-2 text-2xl font-semibold"
                >
                  {selectedTemplate.name}
                </h2>
              </div>
              <button
                type="button"
                aria-label="閉じる"
                onClick={() => setSelectedTemplateId(null)}
                className="rounded-full px-3 py-1 text-2xl leading-none text-muted hover:bg-sage"
              >
                ×
              </button>
            </div>
            {selectedTemplate.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedTemplate.image_url}
                alt={selectedTemplate.name}
                className="mt-5 max-h-[50vh] w-full rounded-2xl bg-sage object-contain"
              />
            ) : (
              <div className="mt-5 flex min-h-40 items-center justify-center rounded-2xl bg-sage text-sm text-forest">
                コーデ画像はありません
              </div>
            )}
            {selectedTemplate.memo && (
              <p className="mt-4 whitespace-pre-wrap rounded-xl bg-[#f7f8f6] p-4 text-sm leading-6 text-ink">
                {selectedTemplate.memo}
              </p>
            )}
            <section className="mt-5">
              <h3 className="text-sm font-semibold">着用した月</h3>
              {displayedWearMonths.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {displayedWearMonths.map((month) => {
                    const wasRecorded = recordedWearMonths.has(month);

                    return (
                      <li
                        key={month}
                        className="rounded-full bg-sage px-3 py-1 text-sm font-medium text-forest"
                      >
                        <span>
                          {formatWearMonth(month)}
                          {wasRecorded && (
                            <span className="ml-1 text-xs text-muted">
                              記録
                            </span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted">
                  着用月はまだ登録されていません。
                </p>
              )}
            </section>
            <section className="mt-5">
              <h3 className="text-sm font-semibold">
                着用アイテム ({selectedTemplate.items.length})
              </h3>
              {selectedTemplate.items.length > 0 ? (
                <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {selectedTemplate.items.map((item) => (
                    <li
                      key={item.id}
                      className="overflow-hidden rounded-xl border border-[#e7ebe7] bg-white"
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
                        <span className="flex aspect-[4/3] items-center justify-center bg-sage text-xs text-forest">
                          画像なし
                        </span>
                      )}
                      <span className="block truncate px-3 py-2 text-sm font-medium">
                        {item.name}
                      </span>
                      <span className="block px-3 pb-2 text-xs text-muted">
                        {categories[item.category] ?? item.category}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted">
                  着用アイテムは登録されていません。
                </p>
              )}
            </section>
            <button
              type="button"
              onClick={() => openEditor(selectedTemplate)}
              className="mt-6 w-full rounded-xl border border-[#dce3dd] px-4 py-3 font-semibold text-forest transition hover:bg-sage focus:outline-none focus:ring-4 focus:ring-sage"
            >
              テンプレートを編集
            </button>
          </section>
        </div>
      )}

      {activeTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSubmitting) {
              setActiveTemplateId(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-dialog-title"
            className="my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold tracking-wide text-forest">
                  OUTFIT TEMPLATE
                </p>
                <h2
                  id="template-dialog-title"
                  className="mt-2 text-2xl font-semibold"
                >
                  テンプレートを編集
                </h2>
              </div>
              <button
                type="button"
                aria-label="閉じる"
                disabled={isSubmitting}
                onClick={() => setActiveTemplateId(null)}
                className="rounded-full px-3 py-1 text-2xl leading-none text-muted hover:bg-sage disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {errorMessage && (
              <p
                role="alert"
                className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {errorMessage}
              </p>
            )}

            <form onSubmit={handleUpdate} className="mt-6 space-y-5">
              <label className="block text-sm font-medium">
                テンプレート名
                <input
                  name="name"
                  type="text"
                  maxLength={80}
                  required
                  defaultValue={activeTemplate.name}
                  className={fieldClassName}
                />
              </label>

              <label className="block text-sm font-medium">
                メモ
                <textarea
                  name="memo"
                  maxLength={2000}
                  rows={3}
                  defaultValue={activeTemplate.memo ?? ""}
                  className={fieldClassName}
                />
              </label>

              <section className="rounded-2xl border border-[#e7ebe7] bg-[#f7f8f6] p-4">
                <h3 className="text-sm font-semibold">着用した月</h3>
                {activeDisplayedWearMonths.length > 0 ? (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {activeDisplayedWearMonths.map((month) => {
                      const wasRecorded =
                        activeRecordedWearMonths.has(month);
                      const wasManuallyAdded =
                        activeManualWearMonths.has(month);

                      return (
                        <li
                          key={month}
                          className="flex items-center gap-2 rounded-full bg-sage py-1 pl-3 pr-1.5 text-sm font-medium text-forest"
                        >
                          <span>
                            {formatWearMonth(month)}
                            {wasRecorded && (
                              <span className="ml-1 text-xs text-muted">
                                記録
                              </span>
                            )}
                          </span>
                          {wasManuallyAdded && (
                            <button
                              type="button"
                              aria-label={`${formatWearMonth(month)}の手動登録を解除`}
                              disabled={isUpdatingWearMonth}
                              onClick={() => removeManualWearMonth(month)}
                              className="rounded-full px-2 py-1 text-xs text-forest transition hover:bg-white disabled:opacity-50"
                            >
                              解除
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted">
                    着用月はまだ登録されていません。
                  </p>
                )}
                {wearMonthError && (
                  <p
                    role="alert"
                    className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700"
                  >
                    {wearMonthError}
                  </p>
                )}
                {wearMonthFeedback && (
                  <p
                    role="status"
                    className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-forest"
                  >
                    {wearMonthFeedback}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <label className="text-sm font-medium">
                    過去の着用月を追加
                    <select
                      value={monthToAdd}
                      onChange={(event) =>
                        setMonthToAdd(Number(event.target.value))
                      }
                      className="mt-1 block rounded-lg border border-[#dce3dd] bg-white px-3 py-2 text-ink outline-none focus:border-forest focus:ring-4 focus:ring-sage"
                    >
                      {Array.from({ length: 12 }, (_, index) => index + 1).map(
                        (month) => (
                          <option key={month} value={month}>
                            {month}月
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={isUpdatingWearMonth}
                    onClick={addManualWearMonth}
                    className="rounded-xl border border-[#dce3dd] bg-white px-4 py-2 text-sm font-semibold text-forest transition hover:bg-sage disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isUpdatingWearMonth ? "更新中..." : "月を追加"}
                  </button>
                </div>
              </section>

              {activeTemplate.image_url && (
                <div>
                  <p className="text-sm font-medium">現在のコーデ画像</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeTemplate.image_url}
                    alt={activeTemplate.name}
                    className="mt-2 max-h-64 w-full rounded-xl bg-sage object-contain"
                  />
                  <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-medium text-red-700">
                    <input
                      type="checkbox"
                      checked={removeImage}
                      onChange={(event) => setRemoveImage(event.target.checked)}
                      className="h-4 w-4 accent-red-700"
                    />
                    現在の画像を削除
                  </label>
                </div>
              )}

              <label className="block text-sm font-medium">
                コーデ画像を変更
                <input
                  name="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(event) => {
                    if (event.target.files?.length) {
                      setRemoveImage(false);
                    }
                  }}
                  className="mt-2 block w-full rounded-xl border border-[#dce3dd] bg-white px-3 py-2.5 text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-sage file:px-3 file:py-2 file:font-medium file:text-forest"
                />
              </label>

              <fieldset>
                <legend className="text-sm font-medium">
                  着用アイテム ({selectedItemIds.length})
                </legend>
                {wardrobeItems.length ? (
                  <>
                    <div
                      className="mt-3 flex flex-wrap gap-2"
                      aria-label="カテゴリで絞り込み"
                    >
                      {categoryFilters.map((category) => {
                        const isSelected = selectedCategory === category.value;
                        const count =
                          category.value === "all"
                            ? wardrobeItems.length
                            : wardrobeItems.filter(
                                (item) => item.category === category.value,
                              ).length;

                        return (
                          <button
                            key={category.value}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => setSelectedCategory(category.value)}
                            className={`rounded-full px-3 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-4 focus:ring-sage ${
                              isSelected
                                ? "bg-forest text-white"
                                : "border border-[#dce3dd] bg-white text-muted hover:bg-sage hover:text-forest"
                            }`}
                          >
                            {category.label}
                            <span className="ml-1 opacity-75">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                    {visibleWardrobeItems.length ? (
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {visibleWardrobeItems.map((item) => (
                          <label
                            key={item.id}
                            className="flex cursor-pointer items-start gap-2 rounded-xl border border-[#e7ebe7] p-3 text-sm hover:bg-sage"
                          >
                            <input
                              type="checkbox"
                              name="itemIds"
                              value={item.id}
                              checked={selectedItemIds.includes(item.id)}
                              onChange={(event) =>
                                setSelectedItemIds((current) =>
                                  event.target.checked
                                    ? [...current, item.id]
                                    : current.filter((id) => id !== item.id),
                                )
                              }
                              className="mt-0.5 accent-[#315b48]"
                            />
                            <span className="min-w-0">
                              <span className="block truncate font-medium">
                                {item.name}
                              </span>
                              <span className="mt-0.5 block text-xs text-muted">
                                {categories[item.category] ?? item.category}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-muted">
                        このカテゴリにはアイテムがありません。
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-2 text-sm text-muted">
                    クローゼットに登録済みの服がありません。
                  </p>
                )}
              </fieldset>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-forest px-4 py-3 font-semibold text-white transition hover:bg-[#264b39] focus:outline-none focus:ring-4 focus:ring-sage disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "保存中..." : "変更を保存"}
              </button>
            </form>

            <div className="mt-5 border-t border-[#e7ebe7] pt-5">
              <button
                type="button"
                onClick={() => handleDelete(activeTemplate)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-red-200 px-4 py-3 font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "処理中..." : "このテンプレートを削除"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
