"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteItem } from "@/app/dashboard/item-actions";

type DeleteItemButtonProps = {
  itemId: string;
  itemName: string;
};

export function DeleteItemButton({
  itemId,
  itemName,
}: DeleteItemButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleDelete() {
    if (!window.confirm(`「${itemName}」を削除しますか？`)) {
      return;
    }

    setIsDeleting(true);
    setMessage("");
    const result = await deleteItem(itemId);
    setMessage(result.message);
    setIsDeleting(false);

    if (result.deleted) {
      router.refresh();
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isDeleting ? "削除中..." : "削除"}
      </button>
      {message && (
        <p
          role={message.startsWith("削除しました") ? "status" : "alert"}
          className="mt-2 text-xs leading-5 text-muted"
        >
          {message}
        </p>
      )}
    </div>
  );
}
