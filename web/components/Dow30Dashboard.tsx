"use client";

import { useMemo, useState } from "react";
import type { Dow30Dataset, Item } from "@/lib/types";
import PeriodToggle from "./PeriodToggle";
import PerfRow from "./PerfRow";
import SiteHeader from "./SiteHeader";
import SectorRotationBoard from "./SectorRotationBoard";
import { useLang } from "./LangProvider";
import { ui, fmtDate, fmtDateTime, dowLabel, blockTitle } from "@/lib/i18n";

function returnFor(item: Item, period: string): number | null {
  if (item.status !== "ok") return null;
  const r = item.returns[period];
  return r ? r.price : null;
}

export default function Dow30Dashboard({ data }: { data: Dow30Dataset }) {
  const { lang } = useLang();
  const t = ui[lang];
  const [period, setPeriod] = useState<string>(
    data.periods.includes("1M") ? "1M" : data.periods[0]
  );
  // ソートトグル: false=ティッカー順（既定）, true=選択期間のリターン降順（33業種と同じ）。
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
    if (!sortDesc) return block.items; // ティッカー順（config 順）
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
      <SiteHeader active="dow" />

      <main className="main">
        <div className="hero">
          <h1 className="hero-title">{t.heroDow}</h1>
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
          {isFixture && <p className="sample-banner">{t.sampleDow}</p>}
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
                displayLabel={dowLabel(lang, item.ticker, item.label)}
              />
            ))}
          </div>
        </section>

        <SectorRotationBoard
          items={block.items}
          labelFor={(it) => dowLabel(lang, it.ticker, it.label)}
          keyOf={(it) => it.ticker}
          stocks
        />
      </main>

      <footer className="site-footer">
        <p>{t.disclaimer}</p>
        <p className="footer-meta">
          {t.dowAttribution}
          <br />
          {t.dowSourceNote}
          <br />
          {t.updatedAt}: {fmtDateTime(lang, data.generated_at)}／{t.source}:{" "}
          {data.data_source}
        </p>
      </footer>
    </div>
  );
}
