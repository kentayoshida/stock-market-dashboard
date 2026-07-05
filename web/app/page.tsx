import fs from "node:fs";
import path from "node:path";
import Dashboard from "@/components/Dashboard";
import type { Dataset } from "@/lib/types";

// latest.json はパイプライン（日次 cron）が生成する。ビルド時に読み込む。
function loadData(): Dataset {
  const p = path.join(process.cwd(), "public", "data", "latest.json");
  const raw = fs.readFileSync(p, "utf-8");
  return JSON.parse(raw) as Dataset;
}

export default function Page() {
  const data = loadData();
  return <Dashboard data={data} />;
}
