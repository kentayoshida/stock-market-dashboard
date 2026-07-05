import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import JpDashboard from "@/components/JpDashboard";
import type { JpDataset } from "@/lib/types";

export const metadata: Metadata = {
  title: "東証33業種 パフォーマンス｜市場ダッシュボード",
  description: "東証33業種別TOPIX の期間別パフォーマンス・ヒートマップ（J-Quants）。",
};

function loadData(): JpDataset {
  const p = path.join(process.cwd(), "public", "data", "jp_sectors.json");
  return JSON.parse(fs.readFileSync(p, "utf-8")) as JpDataset;
}

export default function Page() {
  return <JpDashboard data={loadData()} />;
}
