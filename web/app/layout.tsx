import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { LangProvider } from "@/components/LangProvider";

export const metadata: Metadata = {
  metadataBase: new URL("https://dashboard.markets-lab.com"),
  title: "市場パフォーマンス・ダッシュボード｜markets-lab",
  description:
    "米国上場 ETF による主要株価指数・セクター・国別・コモディティ・債券の期間別パフォーマンス。",
  openGraph: {
    type: "website",
    siteName: "markets-lab",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
  },
  // GSC の HTML タグ検証。Vercel の環境変数に検証コードを設定すると meta 出力される
  // （DNS TXT 方式で検証する場合は未設定で可）。
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <LangProvider>{children}</LangProvider>
        <Analytics />
      </body>
    </html>
  );
}
