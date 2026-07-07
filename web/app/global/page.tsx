import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import GlobalDashboard from "@/components/GlobalDashboard";
import type { GlobalDataset } from "@/lib/types";

export const metadata: Metadata = {
  title: "世界の株式パフォーマンス｜市場ダッシュボード",
  description:
    "先進国・新興国の主要国株式 ETF を地域別（Americas/Europe/MEA/Asia Pacific）に表示するヒートマップ。",
};

function loadData(): GlobalDataset {
  const p = path.join(process.cwd(), "public", "data", "global.json");
  return JSON.parse(fs.readFileSync(p, "utf-8")) as GlobalDataset;
}

export default function Page() {
  return <GlobalDashboard data={loadData()} />;
}
