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
              </div>
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
    </>
  );
}
