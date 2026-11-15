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

type Item = {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  created_at: string;
};

type ItemGridProps = {
  items: Item[];
};

export function ItemGrid({ items }: ItemGridProps) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

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
          </section>
        </div>
      )}
    </>
  );
}
