"use client";

import { useState } from "react";
import type { GlobalDataset, GlobalTier, Item } from "@/lib/types";
import PeriodToggle from "./PeriodToggle";
import PerfRow from "./PerfRow";
import SiteHeader from "./SiteHeader";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

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
          <h1 className="hero-title">世界の株式（主要国）</h1>
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
                <h2 className="tier-title">{tier.title}</h2>
                {tier.lead && (
                  <div className="tier-lead">
                    <PerfRow
                      item={tier.lead}
                      period={period}
                      totalReturn={effectiveTR}
                      maxAbs={maxAbs}
                      linkable
                    />
                  </div>
                )}
              </div>
              <div className="region-grid">
                {tier.groups.map((g) => (
                  <div key={g.region} className="region">
                    <h3 className="region-title">{g.label}</h3>
                    <div className="region-rows">
                      {g.items.map((item) => (
                        <PerfRow
                          key={item.ticker}
                          item={item}
                          period={period}
                          totalReturn={effectiveTR}
                          maxAbs={maxAbs}
                          linkable
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

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
          データ更新: {new Date(data.generated_at).toLocaleString("ja-JP")}／出所:{" "}
          {data.data_source}
        </p>
      </footer>
    </div>
  );
}
