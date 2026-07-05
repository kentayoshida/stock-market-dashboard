"use client";

import { useMemo, useState } from "react";
import type { JpDataset, JpItem } from "@/lib/types";
import PeriodToggle from "./PeriodToggle";
import PerfRow from "./PerfRow";
import SiteHeader from "./SiteHeader";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function returnFor(item: JpItem, period: string): number | null {
  if (item.status !== "ok") return null;
  const r = item.returns[period];
  return r ? r.price : null;
}

export default function JpDashboard({ data }: { data: JpDataset }) {
  const [period, setPeriod] = useState<string>(
    data.periods.includes("1M") ? "1M" : data.periods[0]
  );
  // ソートトグル: false=業種コード順（既定）, true=選択期間のリターン降順（§4）
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
    if (!sortDesc) return block.items; // 業種コード順（config 順）
    // 欠損は末尾。選択期間リターンの降順。
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
      <SiteHeader active="jp" />

      <main className="main">
        <div className="hero">
          <h1 className="hero-title">東証33業種</h1>
          <p className="hero-meta">
            <span className="meta-pill">
              基準日 <b>{fmtDate(data.as_of)}</b>
            </span>
            <span className="meta-pill meta-pill--muted">{data.currency} 建て</span>
            <span className="meta-pill meta-pill--muted">
              採用 {data.coverage.ok}/{data.coverage.total} 業種
            </span>
            <span className="meta-pill meta-pill--lag" title={data.lag_note}>
              1営業日ラグ
            </span>
          </p>
          {isFixture && (
            <p className="sample-banner">
              ⚠ 現在表示中はサンプルデータ（fixture）です。実データは日次バッチ
              （J-Quants）が生成します。
            </p>
          )}
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
          <div className="segmented sort-toggle" role="group" aria-label="並び替え">
            <button
              className={"segment" + (!sortDesc ? " is-active" : "")}
              onClick={() => setSortDesc(false)}
            >
              業種コード順
            </button>
            <button
              className={"segment" + (sortDesc ? " is-active" : "")}
              onClick={() => setSortDesc(true)}
              title="選択中の期間のリターンが高い順"
            >
              リターン降順
            </button>
          </div>
        </div>

        <section className="block">
          <h2 className="block-title">{block.title}</h2>
          <div
            className="jp-grid"
            style={{ columnCount: block.columns }}
          >
            {items.map((item) => (
              <PerfRow
                key={item.index_code}
                item={item}
                period={period}
                totalReturn={false}
                maxAbs={maxAbs}
              />
            ))}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <p>{data.disclaimer}</p>
        <p className="footer-meta">
          {data.attribution}
          <br />
          データ更新: {new Date(data.generated_at).toLocaleString("ja-JP")}／出所:{" "}
          {data.data_source}／{data.lag_note}
        </p>
      </footer>
    </div>
  );
}
