"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAccount, signOut } from "@/app/auth/actions";

type AccountMenuProps = {
  userEmail: string;
};

export function AccountMenu({ userEmail }: AccountMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDeleting, startDelete] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function handleDeleteAccount() {
    if (
      !window.confirm(
        `アカウント「${userEmail}」と、登録した服・コーデ・テンプレート・画像をすべて削除します。この操作は取り消せません。続けますか？`,
      )
    ) {
      return;
    }

    setErrorMessage("");
    startDelete(async () => {
      try {
        const result = await deleteAccount();
        if ("error" in result) {
          setErrorMessage(result.error);
        } else {
          router.replace(
            "/login?message=" +
              encodeURIComponent(
                "アカウントと関連データを削除し、ログアウトしました。",
              ),
          );
        }
      } catch {
        setErrorMessage("アカウントを削除できませんでした。時間をおいて再度お試しください。");
      }
    });
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-label="ユーザー情報を開く"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => {
          setErrorMessage("");
          setIsOpen((open) => !open);
        }}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[#dce3dd] bg-white text-forest transition hover:bg-sage focus:outline-none focus:ring-4 focus:ring-sage"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-5 w-5"
        >
          <circle cx="12" cy="8" r="3.25" />
          <path d="M5.5 20a6.5 6.5 0 0 1 13 0" strokeLinecap="round" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="ユーザー情報"
          className="absolute right-0 z-30 mt-3 w-72 rounded-2xl border border-[#e7ebe7] bg-white p-3 shadow-xl"
        >
          <div className="border-b border-[#e7ebe7] px-3 py-2">
            <p className="text-xs font-semibold tracking-wide text-muted">
              ユーザー情報
            </p>
            <p className="mt-1 break-all text-sm font-medium text-ink">
              {userEmail}
            </p>
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {errorMessage}
            </p>
          )}

          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className="mt-2 w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-ink transition hover:bg-sage"
            >
              ログアウト
            </button>
          </form>

          <button
            type="button"
            role="menuitem"
            disabled={isDeleting}
            onClick={handleDeleteAccount}
            className="mt-1 w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? "アカウントを削除中..." : "アカウントを削除"}
          </button>
        </div>
      )}
    </div>
  );
}
