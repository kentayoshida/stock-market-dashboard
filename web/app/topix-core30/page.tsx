import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import TopixCore30Dashboard from "@/components/TopixCore30Dashboard";
import type { TopixCore30Dataset } from "@/lib/types";

export const metadata: Metadata = {
  title: "TOPIX Core30 パフォーマンス｜市場ダッシュボード",
  description:
    "TOPIX Core30（東証の主力30銘柄）の構成銘柄の期間別パフォーマンス・ヒートマップとセクターローテーション（株時計）。個別株価（J-Quants）ベース。",
};

function loadData(): TopixCore30Dataset {
  const p = path.join(process.cwd(), "public", "data", "topix_core30.json");
  return JSON.parse(fs.readFileSync(p, "utf-8")) as TopixCore30Dataset;
}

export default function Page() {
  return <TopixCore30Dashboard data={loadData()} />;
}
