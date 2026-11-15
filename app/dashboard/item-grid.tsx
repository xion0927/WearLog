"use client";

import { useMemo, useState } from "react";
import { ItemDetails } from "@/app/dashboard/item-details";

const categories = [
  { value: "all", label: "すべて" },
  { value: "tops", label: "トップス" },
  { value: "bottoms", label: "ボトムス" },
  { value: "outerwear", label: "アウター" },
  { value: "shoes", label: "シューズ" },
  { value: "other", label: "その他" },
] as const;

const categoryOrder = new Map<string, number>(
  categories
    .filter((category) => category.value !== "all")
    .map((category, index) => [category.value, index]),
);

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
  wear_months: number[];
  manual_wear_months: number[];
  items: TemplateItem[];
};

type Item = {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  created_at: string;
  templates: OutfitTemplate[];
};

type ItemGridProps = {
  items: Item[];
};

const itemCategories: Record<string, string> = {
  tops: "トップス",
  bottoms: "ボトムス",
  outerwear: "アウター",
  shoes: "シューズ",
  other: "その他",
};

export function ItemGrid({ items }: ItemGridProps) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<OutfitTemplate | null>(null);

  const visibleItems = useMemo(() => {
    const filteredItems =
      selectedCategory === "all"
        ? items
        : items.filter((item) => item.category === selectedCategory);

    return [...filteredItems].sort((a, b) => {
      const categoryDifference =
        (categoryOrder.get(a.category) ?? Number.MAX_SAFE_INTEGER) -
        (categoryOrder.get(b.category) ?? Number.MAX_SAFE_INTEGER);

      if (categoryDifference !== 0) {
        return categoryDifference;
      }

      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [items, selectedCategory]);
  const selectedTemplateWearMonths = selectedTemplate
    ? [
        ...new Set([
          ...selectedTemplate.wear_months,
          ...selectedTemplate.manual_wear_months,
        ]),
      ].sort((a, b) => b - a)
    : [];

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2" aria-label="カテゴリで絞り込み">
        {categories.map((category) => {
          const isSelected = selectedCategory === category.value;
          const count =
            category.value === "all"
              ? items.length
              : items.filter((item) => item.category === category.value).length;

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

      {visibleItems.length ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {visibleItems.map((item) => (
            <article
              key={item.id}
              className="relative overflow-hidden rounded-2xl border border-[#e7ebe7] bg-white shadow-sm"
            >
              <button
                type="button"
                aria-label={`${item.name}の詳細を表示`}
                onClick={() => setSelectedItem(item)}
                className="block w-full text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-forest"
              >
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image_url}
                    alt={item.name}
                    loading="lazy"
                    className="aspect-[4/5] w-full bg-sage object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/5] items-center justify-center bg-sage text-sm text-forest">
                    画像なし
                  </div>
                )}
                <div className="p-4">
                  <p className="truncate font-semibold" title={item.name}>
                    {item.name}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {categories.find((category) => category.value === item.category)
                      ?.label ?? item.category}
                  </p>
                  <p className="mt-2 text-xs text-forest">タップして詳細</p>
                </div>
              </button>
              <ItemDetails item={item} />
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-[#cbd8ce] bg-white px-6 py-12 text-center">
          <p className="font-semibold">
            {selectedCategory === "all"
              ? "まだ服が登録されていません"
              : `${categories.find((category) => category.value === selectedCategory)?.label}はまだ登録されていません`}
          </p>
          <p className="mt-2 text-sm text-muted">
            {selectedCategory === "all"
              ? "上のフォームから最初のアイテムを追加しましょう。"
              : "別のカテゴリを選ぶか、新しいアイテムを登録してください。"}
          </p>
        </div>
      )}

      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedItem(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="wardrobe-item-detail-title"
            className="my-auto max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold tracking-wide text-forest">
                  ITEM DETAILS
                </p>
                <h2
                  id="wardrobe-item-detail-title"
                  className="mt-2 text-2xl font-semibold"
                >
                  {selectedItem.name}
                </h2>
              </div>
              <button
                type="button"
                aria-label="閉じる"
                onClick={() => setSelectedItem(null)}
                className="rounded-full px-3 py-1 text-2xl leading-none text-muted hover:bg-sage"
              >
                ×
              </button>
            </div>
            {selectedItem.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedItem.image_url}
                alt={selectedItem.name}
                className="mt-5 max-h-[55vh] w-full rounded-2xl bg-sage object-contain"
              />
            ) : (
              <div className="mt-5 flex min-h-48 items-center justify-center rounded-2xl bg-sage text-sm text-forest">
                画像なし
              </div>
            )}
            <p className="mt-4 rounded-xl bg-[#f7f8f6] px-4 py-3 text-sm text-muted">
              カテゴリ:{" "}
              {categories.find((category) => category.value === selectedItem.category)
                ?.label ?? selectedItem.category}
            </p>
            <section className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">
                  使用したコーデテンプレート
                </h3>
                <span className="text-sm text-muted">
                  {selectedItem.templates.length}件
                </span>
              </div>
              {selectedItem.templates.length > 0 ? (
                <ul className="mt-3 space-y-3">
                  {selectedItem.templates.map((template) => (
                    <li key={template.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedTemplate(template)}
                        className="flex w-full items-center gap-3 rounded-xl border border-[#e7ebe7] bg-white px-4 py-3 text-left font-semibold text-forest transition hover:bg-sage focus:outline-none focus:ring-4 focus:ring-sage"
                      >
                        {template.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={template.image_url}
                            alt=""
                            loading="lazy"
                            className="h-16 w-16 shrink-0 rounded-lg bg-sage object-cover"
                          />
                        )}
                        <span className="min-w-0 truncate">{template.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 rounded-xl bg-[#f7f8f6] px-4 py-3 text-sm text-muted">
                  この服を含むコーデテンプレートはありません。
                </p>
              )}
            </section>
          </section>
        </div>
      )}

      {selectedTemplate && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-ink/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedTemplate(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="item-outfit-template-title"
            className="my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold tracking-wide text-forest">
                  OUTFIT TEMPLATE
                </p>
                <h2
                  id="item-outfit-template-title"
                  className="mt-2 text-2xl font-semibold"
                >
                  {selectedTemplate.name}
                </h2>
              </div>
              <button
                type="button"
                aria-label="閉じる"
                onClick={() => setSelectedTemplate(null)}
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
              {selectedTemplateWearMonths.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {selectedTemplateWearMonths.map((month) => (
                    <li
                      key={month}
                      className="rounded-full bg-sage px-3 py-1 text-sm font-medium text-forest"
                    >
                      {month}月
                    </li>
                  ))}
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
                  {selectedTemplate.items.map((templateItem) => (
                    <li
                      key={templateItem.id}
                      className="overflow-hidden rounded-xl border border-[#e7ebe7] bg-white"
                    >
                      {templateItem.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={templateItem.image_url}
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
                        {templateItem.name}
                      </span>
                      <span className="block px-3 pb-2 text-xs text-muted">
                        {itemCategories[templateItem.category] ??
                          templateItem.category}
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
          </section>
        </div>
      )}
    </>
  );
}
