import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Dashboard from "@/components/Dashboard";
import type { Dataset } from "@/lib/types";

export const metadata: Metadata = {
  title: "世界の株式パフォーマンス｜市場ダッシュボード",
  description: "先進国・新興国の主要国株式 ETF の期間別パフォーマンス・ヒートマップ。",
};

function loadData(): Dataset {
  const p = path.join(process.cwd(), "public", "data", "global.json");
  return JSON.parse(fs.readFileSync(p, "utf-8")) as Dataset;
}

export default function Page() {
  return (
    <Dashboard data={loadData()} active="global" heroTitle="世界の株式（主要国）" />
  );
}
