"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { deleteItem } from "@/app/dashboard/item-actions";
import { createClient } from "@/lib/supabase/client";

const categories = [
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
const publicImagePrefix = "/storage/v1/object/public/item-images/";
const fieldClassName =
  "mt-2 w-full rounded-xl border border-[#dce3dd] bg-white px-4 py-3 text-ink outline-none transition focus:border-forest focus:ring-4 focus:ring-sage";

type ItemDetailsProps = {
  item: {
    id: string;
    name: string;
    category: string;
    image_url: string | null;
  };
};

export function ItemDetails({ item }: ItemDetailsProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const category = String(formData.get("category") ?? "");
    const imageEntry = formData.get("image");
    const image =
      imageEntry instanceof File && imageEntry.size > 0 ? imageEntry : null;

    if (!name || name.length > 100) {
      setErrorMessage("服の名前は1〜100文字で入力してください。");
      return;
    }

    if (!categories.some((option) => option.value === category)) {
      setErrorMessage("カテゴリを選択してください。");
      return;
    }

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

    let newImagePath: string | null = null;
    let newImageUrl = item.image_url;

    if (image && extension) {
      newImagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("item-images")
        .upload(newImagePath, image, {
          contentType: image.type,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        setErrorMessage(
          `画像をアップロードできませんでした: ${uploadError.message}`,
        );
        setIsSubmitting(false);
        return;
      }

      newImageUrl = supabase.storage
        .from("item-images")
        .getPublicUrl(newImagePath).data.publicUrl;
    }

    const { data: updatedItem, error: updateError } = await supabase
      .from("items")
      .update({ name, category, image_url: newImageUrl })
      .eq("id", item.id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (updateError) {
      const cleanupError = newImagePath
        ? (
            await supabase.storage
              .from("item-images")
              .remove([newImagePath])
          ).error
        : null;
      const cleanupMessage = cleanupError
        ? ` 新しい画像の後片付けにも失敗しました: ${cleanupError.message}`
        : "";
      setErrorMessage(
        `アイテムを更新できませんでした: ${updateError.message}${cleanupMessage}`,
      );
      setIsSubmitting(false);
      return;
    }
    if (!updatedItem) {
      const cleanupError = newImagePath
        ? (
            await supabase.storage
              .from("item-images")
              .remove([newImagePath])
          ).error
        : null;
      const cleanupMessage = cleanupError
        ? ` 新しい画像の後片付けにも失敗しました: ${cleanupError.message}`
        : "";
      setErrorMessage(
        `アイテムが見つからないか、更新する権限がありません。${cleanupMessage}`,
      );
      setIsSubmitting(false);
      return;
    }

    if (newImagePath && item.image_url) {
      try {
        const oldImageUrl = new URL(item.image_url);
        if (oldImageUrl.pathname.startsWith(publicImagePrefix)) {
          const oldImagePath = decodeURIComponent(
            oldImageUrl.pathname.slice(publicImagePrefix.length),
          );
          if (oldImagePath.startsWith(`${user.id}/`)) {
            const { error: cleanupError } = await supabase.storage
              .from("item-images")
              .remove([oldImagePath]);
            if (cleanupError) {
              setErrorMessage(
                `情報は更新しましたが、古い画像を削除できませんでした: ${cleanupError.message}`,
              );
              setIsSubmitting(false);
              router.refresh();
              return;
            }
          }
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? `情報は更新しましたが、古い画像URLを確認できませんでした: ${error.message}`
            : "情報は更新しましたが、古い画像URLを確認できませんでした。",
        );
        setIsSubmitting(false);
        router.refresh();
        return;
      }
    }

    setSuccessMessage("アイテムを更新しました。");
    setIsSubmitting(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!window.confirm(`「${item.name}」を削除しますか？`)) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    const result = await deleteItem(item.id);
    setIsSubmitting(false);

    if (!result.deleted) {
      setErrorMessage(result.message);
      return;
    }

    setIsOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        aria-label={`${item.name}の詳細を開く`}
        title="詳細・編集"
        onClick={() => {
          setErrorMessage("");
          setSuccessMessage("");
          setIsOpen(true);
        }}
        className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-xl text-ink shadow-md transition hover:bg-sage focus:outline-none focus:ring-4 focus:ring-sage"
      >
        ⋮
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSubmitting) {
              setIsOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`item-dialog-title-${item.id}`}
            className="my-auto w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold tracking-wide text-forest">
                  ITEM DETAILS
                </p>
                <h2
                  id={`item-dialog-title-${item.id}`}
                  className="mt-2 text-2xl font-semibold"
                >
                  アイテムを編集
                </h2>
              </div>
              <button
                type="button"
                aria-label="閉じる"
                disabled={isSubmitting}
                onClick={() => setIsOpen(false)}
                className="rounded-full px-3 py-1 text-2xl leading-none text-muted hover:bg-sage disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {successMessage && (
              <p
                role="status"
                className="mt-5 rounded-xl bg-sage px-4 py-3 text-sm text-forest"
              >
                {successMessage}
              </p>
            )}
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
                服の名前
                <input
                  name="name"
                  type="text"
                  maxLength={100}
                  required
                  defaultValue={item.name}
                  className={fieldClassName}
                />
              </label>

              <label className="block text-sm font-medium">
                カテゴリ
                <select
                  name="category"
                  required
                  defaultValue={item.category}
                  className={fieldClassName}
                >
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>

              {item.image_url && (
                <div>
                  <p className="text-sm font-medium">現在の画像</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="mt-2 aspect-[4/3] w-full rounded-xl bg-sage object-contain"
                  />
                </div>
              )}

              <label className="block text-sm font-medium">
                画像を追加・変更
                <input
                  name="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="mt-2 block w-full rounded-xl border border-[#dce3dd] bg-white px-3 py-2.5 text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-sage file:px-3 file:py-2 file:font-medium file:text-forest"
                />
              </label>

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
                onClick={handleDelete}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-red-200 px-4 py-3 font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "処理中..." : "このアイテムを削除"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
