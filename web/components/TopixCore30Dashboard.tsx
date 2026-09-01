"use client";

import { useMemo, useState } from "react";
import type { TopixCore30Dataset, Item } from "@/lib/types";
import PeriodToggle from "./PeriodToggle";
import PerfRow from "./PerfRow";
import SiteHeader from "./SiteHeader";
import SectorRotationBoard from "./SectorRotationBoard";
import { useLang } from "./LangProvider";
import { ui, fmtDate, fmtDateTime, coreLabel, blockTitle } from "@/lib/i18n";

function returnFor(item: Item, period: string): number | null {
  if (item.status !== "ok") return null;
  const r = item.returns[period];
  return r ? r.price : null;
}

// 銘柄名リンク先: Yahoo!ファイナンス（日本）。4桁コード + ".T"。
function coreUrl(item: Item): string {
  return `https://finance.yahoo.co.jp/quote/${encodeURIComponent(item.ticker)}.T`;
}

export default function TopixCore30Dashboard({
  data,
}: {
  data: TopixCore30Dataset;
}) {
  const { lang } = useLang();
  const t = ui[lang];
  const [period, setPeriod] = useState<string>(
    data.periods.includes("1M") ? "1M" : data.periods[0]
  );
  // ソートトグル: false=コード順（既定）, true=選択期間のリターン降順。
  const [sortDesc, setSortDesc] = useState(false);

  const isFixture = data.data_source === "fixture";
  const block = data.block;

  const maxAbs = useMemo(() => {
    let m = 0;
    for (const it of block.items) {
      const v = returnFor(it, period);
      if (v !== null) m = Math.max(m, Math.abs(v));
    }
    return m;
  }, [block.items, period]);

  const items = useMemo(() => {
    if (!sortDesc) return block.items; // コード順（config 順）
    return [...block.items].sort((a, b) => {
      const va = returnFor(a, period);
      const vb = returnFor(b, period);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      return vb - va;
    });
  }, [block.items, period, sortDesc]);

  return (
    <div className="page">
      <SiteHeader active="core30" />

      <main className="main">
        <div className="hero">
          <h1 className="hero-title">{t.heroTopixCore30}</h1>
          <p className="hero-meta">
            <span className="meta-pill">
              {t.asOf} <b>{fmtDate(lang, data.as_of)}</b>
            </span>
            <span className="meta-pill meta-pill--muted">
              {t.denom(data.currency)}
            </span>
            <span className="meta-pill meta-pill--muted">
              {t.coverTickers(data.coverage.ok, data.coverage.total)}
            </span>
          </p>
          {isFixture && <p className="sample-banner">{t.sampleTopixCore30}</p>}
        </div>

        <div className="toggle-bar">
          <PeriodToggle
            periods={data.periods}
            value={period}
            onChange={setPeriod}
            showTotalReturn={false}
            totalReturn={false}
            onToggleTotalReturn={() => {}}
          />
          <div
            className="segmented sort-toggle"
            role="group"
            aria-label={t.sortAria}
          >
            <button
              className={"segment" + (!sortDesc ? " is-active" : "")}
              onClick={() => setSortDesc(false)}
            >
              {t.sortByTicker}
            </button>
            <button
              className={"segment" + (sortDesc ? " is-active" : "")}
              onClick={() => setSortDesc(true)}
              title={t.sortByReturnTitle}
            >
              {t.sortByReturn}
            </button>
          </div>
        </div>

        <section className="block">
          <h2 className="block-title">
            {blockTitle(lang, block.id, block.title)}
          </h2>
          <div className="jp-grid" style={{ columnCount: block.columns }}>
            {items.map((item) => (
              <PerfRow
                key={item.ticker}
                item={item}
                period={period}
                totalReturn={false}
                maxAbs={maxAbs}
                linkable
                hrefFor={coreUrl}
                displayLabel={coreLabel(lang, item.ticker, item.label)}
              />
            ))}
          </div>
        </section>

        <SectorRotationBoard
          items={block.items}
          labelFor={(it) => coreLabel(lang, it.ticker, it.label)}
          keyOf={(it) => it.ticker}
          stocks
        />
      </main>

      <footer className="site-footer">
        <p>{t.disclaimer}</p>
        <p className="footer-meta">
          {t.coreAttribution}
          <br />
          {t.coreSourceNote}
          <br />
          {t.updatedAt}: {fmtDateTime(lang, data.generated_at)}／{t.source}:{" "}
          {data.data_source}
        </p>
      </footer>
    </div>
  );
}
