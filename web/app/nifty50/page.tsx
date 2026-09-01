import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Nifty50Dashboard from "@/components/Nifty50Dashboard";
import type { Nifty50Dataset } from "@/lib/types";

export const metadata: Metadata = {
  title: "NIFTY 50（インド）パフォーマンス｜市場ダッシュボード",
  description:
    "インド NSE の NIFTY 50 構成50銘柄の期間別パフォーマンス・ヒートマップとセクターローテーション（株時計）。個別株価（Yahoo Finance）ベース。",
};

function loadData(): Nifty50Dataset {
  const p = path.join(process.cwd(), "public", "data", "nifty50.json");
  return JSON.parse(fs.readFileSync(p, "utf-8")) as Nifty50Dataset;
}

export default function Page() {
  return <Nifty50Dashboard data={loadData()} />;
}
