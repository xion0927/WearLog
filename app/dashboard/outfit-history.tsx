"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type OutfitItem = {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
};

type Outfit = {
  id: string;
  date: string;
  memo: string | null;
  imageUrl: string | null;
  items: OutfitItem[];
};

type ViewMode = "week" | "month";

const categoryLabels: Record<string, string> = {
  tops: "トップス",
  bottoms: "ボトムス",
  outerwear: "アウター",
  shoes: "シューズ",
  other: "その他",
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function shiftDate(date: Date, days: number) {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}

function getWeekStart(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

function getCalendarStart(date: Date) {
  return getWeekStart(new Date(date.getFullYear(), date.getMonth(), 1));
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
  }).format(date);
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(fromDateKey(value));
}

export function OutfitHistory() {
  const [view, setView] = useState<ViewMode>("week");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [savingTemplateId, setSavingTemplateId] = useState<string | null>(null);
  const [templateFeedback, setTemplateFeedback] = useState("");

  const periodStart =
    view === "week" ? getWeekStart(anchorDate) : getCalendarStart(anchorDate);
  const periodLength = view === "week" ? 7 : 42;
  const periodEnd = shiftDate(periodStart, periodLength - 1);
  const from = toDateKey(periodStart);
  const to = toDateKey(periodEnd);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setErrorMessage("");

    fetch(`/api/outfits?from=${from}&to=${to}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = (await response.json()) as
          | { outfits: Outfit[] }
          | { error: string };
        if (!response.ok || !("outfits" in result)) {
          throw new Error(
            "error" in result ? result.error : "コーデを読み込めませんでした。",
          );
        }
        setOutfits(result.outfits);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "コーデを読み込めませんでした。",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [from, to]);

  useEffect(() => {
    if (!selectedDate) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedDate(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedDate]);

  const outfitsByDate = useMemo(() => {
    const grouped = new Map<string, Outfit[]>();
    for (const outfit of outfits) {
      const dailyOutfits = grouped.get(outfit.date) ?? [];
      dailyOutfits.push(outfit);
      grouped.set(outfit.date, dailyOutfits);
    }
    return grouped;
  }, [outfits]);

  const calendarDays = useMemo(
    () =>
      Array.from({ length: 42 }, (_, index) =>
        shiftDate(fromDateKey(from), index),
      ),
    [from],
  );

  function movePeriod(direction: -1 | 1) {
    setAnchorDate((current) =>
      view === "week"
        ? shiftDate(current, direction * 7)
        : new Date(current.getFullYear(), current.getMonth() + direction, 1),
    );
  }

  function openDay(date: Date) {
    setSelectedDate(toDateKey(date));
  }

  async function saveAsTemplate(
    event: FormEvent<HTMLFormElement>,
    outfitId: string,
  ) {
    event.preventDefault();
    setTemplateFeedback("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = formData.get("templateName");
    if (typeof name !== "string" || !name.trim()) {
      setTemplateFeedback("テンプレート名を入力してください。");
      return;
    }

    setSavingTemplateId(outfitId);
    try {
      const response = await fetch("/api/outfit-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outfitId, name }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "テンプレートを保存できませんでした。");
      }
      setTemplateFeedback(`「${name.trim()}」をテンプレートに保存しました。`);
      form.reset();
    } catch (error) {
      setTemplateFeedback(
        error instanceof Error
          ? error.message
          : "テンプレートを保存できませんでした。",
      );
    } finally {
      setSavingTemplateId(null);
    }
  }

  const selectedOutfits = selectedDate
    ? outfitsByDate.get(selectedDate) ?? []
    : [];

  return (
    <section id="outfit-history" className="mt-16 scroll-mt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-wide text-forest">
            OUTFIT JOURNAL
          </p>
          <h2 className="mt-2 text-2xl font-semibold">コーデの記録</h2>
        </div>
        <div
          role="tablist"
          aria-label="コーデ表示形式"
          className="flex rounded-xl border border-[#dce3dd] bg-white p-1"
        >
          {([
            ["week", "1週間表示"],
            ["month", "1ヶ月表示"],
          ] as const).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={view === mode}
              onClick={() => setView(mode)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                view === mode
                  ? "bg-forest text-white"
                  : "text-muted hover:bg-sage hover:text-forest"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => movePeriod(-1)}
          aria-label={view === "week" ? "前の週" : "前の月"}
          className="rounded-lg border border-[#dce3dd] bg-white px-3 py-2 text-sm text-forest transition hover:bg-sage"
        >
          ←
        </button>
        <h3 className="font-semibold">
          {view === "week"
            ? `${new Intl.DateTimeFormat("ja-JP", {
                month: "long",
                day: "numeric",
              }).format(periodStart)} 〜 ${new Intl.DateTimeFormat("ja-JP", {
                month: "long",
                day: "numeric",
              }).format(periodEnd)}`
            : formatMonth(anchorDate)}
        </h3>
        <button
          type="button"
          onClick={() => movePeriod(1)}
          aria-label={view === "week" ? "次の週" : "次の月"}
          className="rounded-lg border border-[#dce3dd] bg-white px-3 py-2 text-sm text-forest transition hover:bg-sage"
        >
          →
        </button>
      </div>

      {errorMessage ? (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </p>
      ) : isLoading ? (
        <p role="status" className="mt-5 text-sm text-muted">
          コーデを読み込んでいます…
        </p>
      ) : view === "week" ? (
        <div className="mt-5 overflow-x-auto pb-3">
          <div className="flex min-w-[840px] gap-3">
            {Array.from({ length: 7 }, (_, index) => {
              const date = shiftDate(periodStart, index);
              const dateKey = toDateKey(date);
              const dailyOutfits = outfitsByDate.get(dateKey) ?? [];
              const preview = dailyOutfits[0];
              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => openDay(date)}
                  aria-label={`${formatLongDate(dateKey)}のコーデを表示`}
                  className="group min-w-0 flex-1 overflow-hidden rounded-2xl border border-[#e7ebe7] bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#b8c9bd] hover:shadow-md focus:outline-none focus:ring-4 focus:ring-sage"
                >
                  <span className="block border-b border-[#edf0ed] px-3 py-3">
                    <span className="block text-xs text-muted">
                      {new Intl.DateTimeFormat("ja-JP", {
                        weekday: "short",
                      }).format(date)}
                    </span>
                    <span className="mt-1 block font-semibold text-ink">
                      {date.getDate()}日
                    </span>
                  </span>
                  {preview?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview.imageUrl}
                      alt=""
                      loading="lazy"
                      className="aspect-[4/3] w-full bg-sage object-cover"
                    />
                  ) : (
                    <span className="flex aspect-[4/3] w-full items-center justify-center bg-[#f3f6f3] text-xs text-muted">
                      {preview ? "画像なし" : "記録なし"}
                    </span>
                  )}
                  <span className="block min-h-12 px-3 py-2 text-xs text-muted">
                    {dailyOutfits.length > 0
                      ? `${dailyOutfits.length}件のコーデ`
                      : "タップして詳細"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-[#e7ebe7] bg-white p-3 shadow-sm sm:p-5">
          <div className="grid grid-cols-7">
            {["月", "火", "水", "木", "金", "土", "日"].map((day) => (
              <span
                key={day}
                className="py-2 text-center text-xs font-medium text-muted"
              >
                {day}
              </span>
            ))}
            {calendarDays.map((date) => {
              const dateKey = toDateKey(date);
              const dailyOutfits = outfitsByDate.get(dateKey) ?? [];
              const preview = dailyOutfits[0];
              const isCurrentMonth = date.getMonth() === anchorDate.getMonth();
              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => openDay(date)}
                  aria-label={`${formatLongDate(dateKey)}のコーデを表示`}
                  className={`group min-h-20 border-t border-[#edf0ed] p-1 text-left transition hover:bg-sage/60 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-forest sm:min-h-28 sm:p-2 ${
                    isCurrentMonth ? "text-ink" : "text-[#aab2ac]"
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span className="text-xs font-medium sm:text-sm">
                      {date.getDate()}
                    </span>
                    {dailyOutfits.length > 0 && (
                      <span className="rounded-full bg-sage px-1.5 py-0.5 text-[10px] font-medium text-forest sm:text-xs">
                        {dailyOutfits.length}
                      </span>
                    )}
                  </span>
                  {preview?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview.imageUrl}
                      alt=""
                      loading="lazy"
                      className="mt-1 aspect-[4/3] w-full rounded-md bg-sage object-cover"
                    />
                  ) : dailyOutfits.length > 0 ? (
                    <span className="mt-1 hidden rounded-md bg-sage px-1 py-2 text-center text-[10px] text-forest sm:block">
                      コーデあり
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedDate(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="outfit-dialog-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold tracking-wide text-forest">
                  OUTFIT DETAILS
                </p>
                <h2
                  id="outfit-dialog-title"
                  className="mt-1 text-xl font-semibold"
                >
                  {formatLongDate(selectedDate)}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                aria-label="閉じる"
                className="rounded-lg px-3 py-1 text-2xl leading-none text-muted hover:bg-sage hover:text-forest"
              >
                ×
              </button>
            </div>

            {selectedOutfits.length > 0 ? (
              <div className="mt-5 space-y-7">
                {selectedOutfits.map((outfit) => (
                  <article key={outfit.id} className="space-y-4">
                    {outfit.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={outfit.imageUrl}
                        alt={`${formatLongDate(selectedDate)}のコーデ`}
                        className="max-h-[50vh] w-full rounded-xl bg-sage object-contain"
                      />
                    ) : (
                      <div className="flex min-h-32 items-center justify-center rounded-xl bg-[#f3f6f3] text-sm text-muted">
                        コーデ画像はありません
                      </div>
                    )}

                    {outfit.memo && (
                      <p className="whitespace-pre-wrap rounded-xl bg-[#f7f8f6] p-4 text-sm leading-6 text-ink">
                        {outfit.memo}
                      </p>
                    )}

                    <div>
                      <h3 className="text-sm font-semibold">
                        着用アイテム ({outfit.items.length})
                      </h3>
                      {outfit.items.length > 0 ? (
                        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {outfit.items.map((item) => (
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
                                {categoryLabels[item.category] ?? item.category}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-muted">
                          着用アイテムの登録はありません。
                        </p>
                      )}
                    </div>
                    <form
                      onSubmit={(event) => saveAsTemplate(event, outfit.id)}
                      className="rounded-xl border border-[#e7ebe7] bg-[#f7f8f6] p-4"
                    >
                      <label className="block text-sm font-medium">
                        テンプレート名
                        <input
                          name="templateName"
                          type="text"
                          required
                          maxLength={80}
                          defaultValue={`${formatLongDate(selectedDate)}のコーデ`}
                          className="mt-2 w-full rounded-xl border border-[#dce3dd] bg-white px-4 py-3 text-ink outline-none transition focus:border-forest focus:ring-4 focus:ring-sage"
                        />
                      </label>
                      <button
                        type="submit"
                        disabled={savingTemplateId === outfit.id}
                        className="mt-3 rounded-xl border border-[#dce3dd] bg-white px-4 py-2 text-sm font-semibold text-forest transition hover:bg-sage disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingTemplateId === outfit.id
                          ? "保存中..."
                          : "テンプレートとして保存"}
                      </button>
                      {templateFeedback && (
                        <p
                          role="status"
                          className="mt-2 text-sm text-forest"
                        >
                          {templateFeedback}
                        </p>
                      )}
                    </form>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-6 rounded-xl bg-[#f7f8f6] px-4 py-8 text-center text-sm text-muted">
                この日のコーデ記録はありません。
              </p>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
