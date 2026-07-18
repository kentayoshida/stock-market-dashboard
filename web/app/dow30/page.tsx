import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Dow30Dashboard from "@/components/Dow30Dashboard";
import type { Dow30Dataset } from "@/lib/types";

export const metadata: Metadata = {
  title: "ダウ工業株30種 パフォーマンス｜市場ダッシュボード",
  description:
    "ダウ工業株30種（Dow Jones 30）の構成30銘柄の期間別パフォーマンス・ヒートマップとセクターローテーション（株時計）。個別株価ベース。",
};

function loadData(): Dow30Dataset {
  const p = path.join(process.cwd(), "public", "data", "dow30.json");
  return JSON.parse(fs.readFileSync(p, "utf-8")) as Dow30Dataset;
}

export default function Page() {
  return <Dow30Dashboard data={loadData()} />;
}
