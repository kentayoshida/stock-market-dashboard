import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Topix17Dashboard from "@/components/Topix17Dashboard";
import type { Topix17Dataset } from "@/lib/types";

export const metadata: Metadata = {
  title: "TOPIX-17 業種別 パフォーマンス｜市場ダッシュボード",
  description:
    "TOPIX-17（17業種）の期間別パフォーマンス・ヒートマップとセクターローテーション（株時計）。対応 NEXT FUNDS ETF ベース。",
};

function loadData(): Topix17Dataset {
  const p = path.join(process.cwd(), "public", "data", "topix17.json");
  return JSON.parse(fs.readFileSync(p, "utf-8")) as Topix17Dataset;
}

export default function Page() {
  return <Topix17Dashboard data={loadData()} />;
}
