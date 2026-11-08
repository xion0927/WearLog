import Link from "next/link";
import { AccountMenu } from "@/app/account-menu";

type SiteHeaderProps = {
  currentPage: "journal" | "closet" | "record";
  userEmail: string;
};

const linkClassName =
  "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-sage";

export function SiteHeader({ currentPage, userEmail }: SiteHeaderProps) {
  return (
    <header className="border-b border-[#e7ebe7] bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage font-semibold text-forest">
            W
          </span>
          <span className="font-semibold tracking-wide text-forest">WEARLOG</span>
        </Link>

        <nav
          aria-label="メインナビゲーション"
          className="flex flex-wrap items-center justify-end gap-2"
        >
          <Link
            href="/outfits/new"
            aria-current={currentPage === "record" ? "page" : undefined}
            className={`${linkClassName} ${
              currentPage === "record"
                ? "bg-[#264b39] text-white"
                : "bg-forest text-white hover:bg-[#264b39]"
            }`}
          >
            今日のコーデを記録する
          </Link>
          <Link
            href="/closet"
            aria-current={currentPage === "closet" ? "page" : undefined}
            className={`${linkClassName} ${
              currentPage === "closet"
                ? "bg-sage text-forest"
                : "border border-[#dce3dd] bg-white text-forest hover:bg-sage"
            }`}
          >
            クローゼット
          </Link>
          <AccountMenu userEmail={userEmail} />
        </nav>
      </div>
    </header>
  );
}
