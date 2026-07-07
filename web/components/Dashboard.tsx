"use client";

import { useState } from "react";
import type { Dataset } from "@/lib/types";
import PeriodToggle from "./PeriodToggle";
import HeatmapBlock from "./HeatmapBlock";
import SiteHeader from "./SiteHeader";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function Dashboard({
  data,
  active = "us",
  heroTitle = "主要米国株価指数",
}: {
  data: Dataset;
  active?: "us" | "global";
  heroTitle?: string;
}) {
  const [period, setPeriod] = useState<string>(
    data.periods.includes("1M") ? "1M" : data.periods[0]
  );
  const [totalReturn, setTotalReturn] = useState(false);

  const canTotalReturn = data.total_return_periods.includes(period);
  const showTR = canTotalReturn; // 1Y のみ表示
  const effectiveTR = canTotalReturn && totalReturn;

  const isFixture = data.data_source === "fixture";

  // コモディティ/債券/その他はページ下部の別セクションへ分離（ユーザー要望）。
  const BOTTOM_IDS = new Set(["commodities", "bonds", "others"]);
  const topBlocks = data.blocks.filter((b) => !BOTTOM_IDS.has(b.id));
  const bottomBlocks = data.blocks.filter((b) => BOTTOM_IDS.has(b.id));

  return (
    <div className="page">
      <SiteHeader active={active} />

      <main className="main">
        <div className="hero">
          <h1 className="hero-title">{heroTitle}</h1>
          <p className="hero-meta">
            <span className="meta-pill">
              基準日 <b>{fmtDate(data.as_of)}</b>
            </span>
            <span className="meta-pill meta-pill--muted">
              {data.currency} 建て・米国上場 ETF
            </span>
            <span className="meta-pill meta-pill--muted">
              採用 {data.coverage.ok}/{data.coverage.total} 銘柄
            </span>
          </p>
          {isFixture && (
            <p className="sample-banner">
              ⚠ 現在表示中はサンプルデータ（fixture）です。実データは日次バッチ
              （yfinance）が生成します。
            </p>
          )}
        </div>

        <PeriodToggle
          periods={data.periods}
          value={period}
          onChange={setPeriod}
          showTotalReturn={showTR}
          totalReturn={effectiveTR}
          onToggleTotalReturn={setTotalReturn}
        />

        <div className="blocks-grid">
          {topBlocks.map((block) => (
            <HeatmapBlock
              key={block.id}
              block={block}
              period={period}
              totalReturn={effectiveTR}
            />
          ))}
        </div>

        {bottomBlocks.length > 0 && (
          <div className="blocks-grid blocks-grid--secondary">
            {bottomBlocks.map((block) => (
              <HeatmapBlock
                key={block.id}
                block={block}
                period={period}
                totalReturn={effectiveTR}
              />
            ))}
          </div>
        )}

        {effectiveTR && (
          <p className="tr-note">
            「配当込み」は調整後終値（Adj Close）由来のトータルリターン。他期間は
            価格リターン（終値ベース）。
          </p>
        )}
      </main>

      <footer className="site-footer">
        <p>{data.disclaimer}</p>
        <p className="footer-meta">
          データ更新: {new Date(data.generated_at).toLocaleString("ja-JP")}／
          出所: {data.data_source}
        </p>
      </footer>
    </div>
  );
}
