import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WearLog | 今日のコーデを記録",
  description: "毎日のコーディネートを記録する WearLog。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
