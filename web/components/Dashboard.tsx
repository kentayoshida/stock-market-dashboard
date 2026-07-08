"use client";

import { useState } from "react";
import type { Dataset } from "@/lib/types";
import PeriodToggle from "./PeriodToggle";
import HeatmapBlock from "./HeatmapBlock";
import SiteHeader from "./SiteHeader";
import SectorRotationBoard from "./SectorRotationBoard";
import { useLang } from "./LangProvider";
import { ui, fmtDate, fmtDateTime, equityLabel } from "@/lib/i18n";

export default function Dashboard({
  data,
  active = "us",
}: {
  data: Dataset;
  active?: "us" | "global";
}) {
  const { lang } = useLang();
  const t = ui[lang];
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

  // 株時計（セクターローテーション）は S&P500 セクター ETF を使用。
  const sectorsBlock = data.blocks.find((b) => b.id === "sectors");

  return (
    <div className="page">
      <SiteHeader active={active} />

      <main className="main">
        <div className="hero">
          <h1 className="hero-title">{t.heroUs}</h1>
          <p className="hero-meta">
            <span className="meta-pill">
              {t.asOf} <b>{fmtDate(lang, data.as_of)}</b>
            </span>
            <span className="meta-pill meta-pill--muted">
              {t.denomUsListed(data.currency)}
            </span>
            <span className="meta-pill meta-pill--muted">
              {t.coverTickers(data.coverage.ok, data.coverage.total)}
            </span>
          </p>
          {isFixture && <p className="sample-banner">{t.sampleUs}</p>}
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

        {effectiveTR && <p className="tr-note">{t.trNote}</p>}

        {sectorsBlock && (
          <SectorRotationBoard
            items={sectorsBlock.items}
            labelFor={(it) => equityLabel(lang, it.ticker, it.label)}
            keyOf={(it) => it.ticker}
          />
        )}
      </main>

      <footer className="site-footer">
        <p>{t.disclaimer}</p>
        <p className="footer-meta">
          {t.updatedAt}: {fmtDateTime(lang, data.generated_at)}／{t.source}:{" "}
          {data.data_source}
        </p>
      </footer>
    </div>
  );
}
