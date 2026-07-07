"use client";

import { useState } from "react";
import type { GlobalDataset, GlobalTier, Item } from "@/lib/types";
import PeriodToggle from "./PeriodToggle";
import PerfRow from "./PerfRow";
import SiteHeader from "./SiteHeader";
import { useLang } from "./LangProvider";
import {
  ui,
  fmtDate,
  fmtDateTime,
  equityLabel,
  tierTitle,
  regionLabel,
} from "@/lib/i18n";

function returnOf(item: Item, period: string, tr: boolean): number | null {
  if (item.status !== "ok") return null;
  const r = item.returns[period];
  if (!r) return null;
  return tr && r.total !== null ? r.total : r.price;
}

// ティア内の全 ETF（lead＋各地域）で最大絶対リターンを求め、バーを正規化する
// （地域横断で比較できるよう、正規化はティア単位）。
function tierMaxAbs(tier: GlobalTier, period: string, tr: boolean): number {
  let m = 0;
  const consider = (it: Item | null) => {
    if (!it) return;
    const v = returnOf(it, period, tr);
    if (v !== null) m = Math.max(m, Math.abs(v));
  };
  consider(tier.lead);
  for (const g of tier.groups) for (const it of g.items) consider(it);
  return m;
}

export default function GlobalDashboard({ data }: { data: GlobalDataset }) {
  const { lang } = useLang();
  const t = ui[lang];
  const [period, setPeriod] = useState<string>(
    data.periods.includes("1M") ? "1M" : data.periods[0]
  );
  const [totalReturn, setTotalReturn] = useState(false);

  const canTR = data.total_return_periods.includes(period);
  const effectiveTR = canTR && totalReturn;
  const isFixture = data.data_source === "fixture";

  return (
    <div className="page">
      <SiteHeader active="global" />

      <main className="main">
        <div className="hero">
          <h1 className="hero-title">{t.heroGlobal}</h1>
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
          showTotalReturn={canTR}
          totalReturn={effectiveTR}
          onToggleTotalReturn={setTotalReturn}
        />

        {/* 上段=先進国／下段=新興国。地域列は左→右に Americas→Europe→MEA→Asia Pacific で
            上下ティア共通のため、同じ地域が縦に揃う。 */}
        {data.tiers.map((tier) => {
          const maxAbs = tierMaxAbs(tier, period, effectiveTR);
          return (
            <section key={tier.id} className="tier">
              <div className="tier-head">
                <h2 className="tier-title">
                  {tierTitle(lang, tier.id, tier.title)}
                </h2>
                {tier.lead && (
                  <div className="tier-lead">
                    <PerfRow
                      item={tier.lead}
                      period={period}
                      totalReturn={effectiveTR}
                      maxAbs={maxAbs}
                      linkable
                      displayLabel={equityLabel(
                        lang,
                        tier.lead.ticker,
                        tier.lead.label
                      )}
                    />
                  </div>
                )}
              </div>
              <div className="region-grid">
                {tier.groups.map((g) => (
                  <div key={g.region} className="region">
                    <h3 className="region-title">
                      {regionLabel(lang, g.region, g.label)}
                    </h3>
                    <div className="region-rows">
                      {g.items.map((item) => (
                        <PerfRow
                          key={item.ticker}
                          item={item}
                          period={period}
                          totalReturn={effectiveTR}
                          maxAbs={maxAbs}
                          linkable
                          displayLabel={equityLabel(lang, item.ticker, item.label)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {effectiveTR && <p className="tr-note">{t.trNote}</p>}
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
