"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type DeleteItemResult = {
  deleted: boolean;
  message: string;
};

const publicImagePrefix = "/storage/v1/object/public/item-images/";

export async function deleteItem(itemId: string): Promise<DeleteItemResult> {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      itemId,
    )
  ) {
    return { deleted: false, message: "削除対象のアイテムが正しくありません。" };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return {
      deleted: false,
      message: `ログイン状態を確認できませんでした: ${userError.message}`,
    };
  }
  if (!user) {
    return { deleted: false, message: "ログインしてください。" };
  }

  const { data: item, error: deleteError } = await supabase
    .from("items")
    .delete()
    .eq("id", itemId)
    .select("image_url")
    .maybeSingle();

  if (deleteError) {
    return {
      deleted: false,
      message: `アイテムを削除できませんでした: ${deleteError.message}`,
    };
  }
  if (!item) {
    return {
      deleted: false,
      message: "アイテムが見つからないか、削除する権限がありません。",
    };
  }

  let warning = "";
  if (item.image_url) {
    try {
      const imageUrl = new URL(item.image_url);
      if (imageUrl.pathname.startsWith(publicImagePrefix)) {
        const imagePath = decodeURIComponent(
          imageUrl.pathname.slice(publicImagePrefix.length),
        );
        if (imagePath.startsWith(`${user.id}/`)) {
          const { error: storageError } = await supabase.storage
            .from("item-images")
            .remove([imagePath]);
          if (storageError) {
            warning = ` 画像ファイルの削除に失敗しました: ${storageError.message}`;
          }
        }
      }
    } catch (error) {
      warning =
        error instanceof Error
          ? ` 画像URLを確認できませんでした: ${error.message}`
          : " 画像URLを確認できませんでした。";
    }
  }

  revalidatePath("/dashboard");
  return {
    deleted: true,
    message: `削除しました。${warning}`,
  };
}
