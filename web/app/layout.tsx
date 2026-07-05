import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "市場パフォーマンス・ダッシュボード",
  description:
    "米国上場 ETF による主要株価指数・セクター・国別・コモディティ・債券の期間別パフォーマンス。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
