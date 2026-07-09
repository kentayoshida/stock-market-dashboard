import type { Metadata } from "next";
import Portal from "@/components/Portal";

export const metadata: Metadata = {
  title: "markets-lab｜マーケットデータ・ラボ",
  description:
    "米国・世界・日本の市場パフォーマンスと、日本版 Fear & Greed 指数。マーケットのデータをシンプルに可視化するダッシュボード集。",
  alternates: { canonical: "https://markets-lab.com/" },
  openGraph: {
    title: "markets-lab｜マーケットデータ・ラボ",
    description:
      "市場パフォーマンス・ダッシュボードと日本版 Fear & Greed 指数。",
    url: "https://markets-lab.com/",
  },
};

export default function Page() {
  return <Portal />;
}
