"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
const fieldClassName =
  "mt-2 w-full rounded-xl border border-[#dce3dd] bg-white px-4 py-3 text-ink outline-none transition placeholder:text-[#a0aaa3] focus:border-forest focus:ring-4 focus:ring-sage";

export function ItemForm() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
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

    let extension: string | undefined;
    if (image) {
      extension = imageExtensions[image.type];
      if (!extension) {
        setErrorMessage("JPEG、PNG、WebP、GIF形式の画像を選択してください。");
        return;
      }

      if (image.size > maxImageSize) {
        setErrorMessage("画像サイズは5MB以下にしてください。");
        return;
      }
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
        .from("item-images")
        .upload(imagePath, image, {
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

      const {
        data: { publicUrl },
      } = supabase.storage.from("item-images").getPublicUrl(imagePath);
      imageUrl = publicUrl;
    }

    const { error: insertError } = await supabase.from("items").insert({
      user_id: user.id,
      name,
      category,
      image_url: imageUrl,
    });

    if (insertError) {
      const cleanupError = imagePath
        ? (
            await supabase.storage
              .from("item-images")
              .remove([imagePath])
          ).error
        : null;
      const cleanupMessage = cleanupError
        ? ` 画像の後片付けにも失敗しました: ${cleanupError.message}`
        : "";
      setErrorMessage(
        `服を保存できませんでした: ${insertError.message}${cleanupMessage}`,
      );
      setIsSubmitting(false);
      return;
    }

    form.reset();
    setSuccessMessage("服を登録しました。");
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <section className="mt-10 rounded-2xl border border-[#e7ebe7] bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-semibold">服を登録する</h2>

      {errorMessage && (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </p>
      )}
      {successMessage && (
        <p
          role="status"
          className="mt-5 rounded-xl bg-sage px-4 py-3 text-sm text-forest"
        >
          {successMessage}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 grid gap-5 sm:grid-cols-2"
      >
        <label className="text-sm font-medium sm:col-span-2">
          服の名前
          <input
            name="name"
            type="text"
            maxLength={100}
            required
            className={fieldClassName}
            placeholder="例：白いシャツ"
          />
        </label>

        <label className="text-sm font-medium">
          カテゴリ
          <select
            name="category"
            required
            defaultValue=""
            className={fieldClassName}
          >
            <option value="" disabled>
              カテゴリを選択
            </option>
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium">
          画像（任意）
          <input
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="mt-2 block w-full rounded-xl border border-[#dce3dd] bg-white px-3 py-2.5 text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-sage file:px-3 file:py-2 file:font-medium file:text-forest"
          />
        </label>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-forest px-4 py-3 font-semibold text-white transition hover:bg-[#264b39] focus:outline-none focus:ring-4 focus:ring-sage disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-40"
          >
            {isSubmitting ? "登録中..." : "服を登録する"}
          </button>
        </div>
      </form>
    </section>
  );
}
