"use client";

import { useState } from "react";
import Link from "next/link";

type MonthlyOutfitRankingWardrobeItem = {
  id: string;
  name: string;
  category: string;
  imageUrl: string | null;
};

export type MonthlyOutfitRankingItem = {
  id: string;
  name: string;
  memo: string | null;
  imageUrl: string | null;
  wearCount: number;
  items: MonthlyOutfitRankingWardrobeItem[];
};

type MonthlyOutfitRankingProps = {
  rankings: Record<number, MonthlyOutfitRankingItem[]>;
  errorMessage?: string;
};

const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1);
const categoryLabels: Record<string, string> = {
  tops: "トップス",
  bottoms: "ボトムス",
  outerwear: "アウター",
  shoes: "シューズ",
  other: "その他",
};

function getCurrentMonth() {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      month: "numeric",
      timeZone: "Asia/Tokyo",
    }).format(new Date()),
  );
}

export function MonthlyOutfitRanking({
  rankings,
  errorMessage,
}: MonthlyOutfitRankingProps) {
  const [month, setMonth] = useState(getCurrentMonth);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showAll, setShowAll] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const items = rankings[month] ?? [];
  const sortedItems = [...items].sort((a, b) => {
    const countDifference =
      sortOrder === "asc"
        ? a.wearCount - b.wearCount
        : b.wearCount - a.wearCount;
    return countDifference || a.name.localeCompare(b.name, "ja");
  });
  const visibleItems = showAll ? sortedItems : sortedItems.slice(0, 5);
  const selectedTemplate = items.find(
    (item) => item.id === selectedTemplateId,
  );

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-wide text-forest">
            MONTHLY OUTFIT RANKING
          </p>
          <h2 className="mt-2 text-2xl font-semibold">月別コーデランキング</h2>
          <p className="mt-2 text-sm text-muted">
            選択した月のタグが付いたコーデを、着用回数の順に表示します。
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium">
            対象月
            <select
              value={month}
              onChange={(event) => {
                setMonth(Number(event.target.value));
                setShowAll(false);
              }}
              className="ml-2 rounded-xl border border-[#dce3dd] bg-white px-3 py-2 text-ink outline-none focus:border-forest focus:ring-4 focus:ring-sage"
            >
              {monthOptions.map((monthOption) => (
                <option key={monthOption} value={monthOption}>
                  {monthOption}月
                </option>
              ))}
            </select>
          </label>
          <div
            role="group"
            aria-label="着用回数の並び順"
            className="flex rounded-xl border border-[#dce3dd] bg-white p-1"
          >
            {(
              [
                ["asc", "少ない順"],
                ["desc", "多い順"],
              ] as const
            ).map(([order, label]) => (
              <button
                key={order}
                type="button"
                aria-pressed={sortOrder === order}
                onClick={() => setSortOrder(order)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  sortOrder === order
                    ? "bg-forest text-white"
                    : "text-muted hover:bg-sage hover:text-forest"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {errorMessage ? (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          ランキングを読み込めませんでした: {errorMessage}
          。Supabase SQL Editorで最新版の `supabase/outfits.sql` を実行してください。
        </p>
      ) : sortedItems.length > 0 ? (
        <>
          <ol className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {visibleItems.map((item, index) => (
              <li
                key={item.id}
                className="overflow-hidden rounded-2xl border border-[#e7ebe7] bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#b8c9bd] hover:shadow-md"
              >
                <button
                  type="button"
                  aria-label={`${item.name}の詳細を表示`}
                  onClick={() => setSelectedTemplateId(item.id)}
                  className="block w-full text-left focus:outline-none focus:ring-4 focus:ring-inset focus:ring-forest"
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      loading="lazy"
                      className="aspect-[4/3] w-full bg-sage object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-sage text-sm text-forest">
                      画像なし
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-xs font-semibold text-forest">
                      {index + 1}位
                    </p>
                    <p
                      className="mt-1 truncate text-sm font-semibold"
                      title={item.name}
                    >
                      {item.name}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      着用 {item.wearCount}回
                    </p>
                    <p className="mt-2 text-xs text-forest">タップして詳細</p>
                  </div>
                </button>
              </li>
            ))}
          </ol>
          {sortedItems.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAll((current) => !current)}
              className="mt-5 rounded-xl border border-[#dce3dd] bg-white px-5 py-2.5 text-sm font-semibold text-forest transition hover:bg-sage focus:outline-none focus:ring-4 focus:ring-sage"
            >
              {showAll ? "閉じる" : "もっと見る"}
            </button>
          )}
        </>
      ) : !errorMessage ? (
        <p className="mt-5 rounded-2xl border border-dashed border-[#cbd8ce] bg-white px-6 py-8 text-center text-sm text-muted">
          {month}月のタグが付いたテンプレートはありません。
        </p>
      ) : null}

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
            aria-labelledby="monthly-ranking-template-title"
            className="my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold tracking-wide text-forest">
                  OUTFIT TEMPLATE
                </p>
                <h2
                  id="monthly-ranking-template-title"
                  className="mt-2 text-2xl font-semibold"
                >
                  {selectedTemplate.name}
                </h2>
                <p className="mt-2 text-sm text-muted">
                  着用 {selectedTemplate.wearCount}回
                </p>
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
            {selectedTemplate.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedTemplate.imageUrl}
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
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
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
                        {categoryLabels[item.category] ?? item.category}
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
            <Link
              href={`/outfits/new?templateId=${encodeURIComponent(selectedTemplate.id)}`}
              className="mt-6 block w-full rounded-xl bg-forest px-4 py-3 text-center font-semibold text-white transition hover:bg-[#264b39] focus:outline-none focus:ring-4 focus:ring-sage"
            >
              今日のコーデを記録
            </Link>
          </section>
        </div>
      )}
    </section>
  );
}
