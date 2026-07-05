"use client";

import type { Item } from "@/lib/types";

type Props = {
  item: Item;
  period: string;
  totalReturn: boolean;
  maxAbs: number; // ブロック内正規化の基準（§4.1）
};

function fmtPct(v: number): string {
  const sign = v > 0 ? "+" : v < 0 ? "−" : "±"; // + / − / ±
  return `${sign}${Math.abs(v).toFixed(2)}%`;
}

// 1行 = ラベル（左）＋ 横バー（中・ブロック内正規化）＋ リターン％（右）。
// 数値が一次情報、バーは二次情報（§4.1）。
export default function PerfRow({ item, period, totalReturn, maxAbs }: Props) {
  const r = item.returns[period];
  const value =
    item.status === "ok" && r
      ? totalReturn && r.total !== null
        ? r.total
        : r.price
      : null;

  if (item.status === "no_data" || value === null) {
    return (
      <div className="row row--nodata">
        <span className="row-label">
          <span className="row-name">{item.label}</span>
          <span className="row-ticker">{item.ticker}</span>
        </span>
        <span className="row-bar" aria-hidden="true" />
        <span className="row-value row-value--nodata">データなし</span>
      </div>
    );
  }

  const pos = value >= 0;
  const width = maxAbs > 0 ? Math.min(100, (Math.abs(value) / maxAbs) * 100) : 0;
  // near-zero は面へ退色、絶対値が大きいほど濃色（§4.1）。
  const intensity = maxAbs > 0 ? 0.35 + 0.65 * (Math.abs(value) / maxAbs) : 0.35;
  const hue = pos ? "var(--gain)" : "var(--loss)";
  const fill = `color-mix(in srgb, ${hue} ${Math.round(intensity * 100)}%, var(--surface-2))`;

  return (
    <div className={"row" + (item.stale ? " row--stale" : "")}>
      <span className="row-label">
        <span className="row-name">{item.label}</span>
        <span className="row-ticker">{item.ticker}</span>
        {item.review && (
          <span className="row-flag" title="要確認: 代表ETFの選定に幅あり（Ken 判断待ち）">
            要確認
          </span>
        )}
      </span>
      <span className="row-bar">
        <span
          className="row-bar-fill"
          style={{ width: `${width}%`, background: fill }}
        />
      </span>
      <span className={"row-value " + (pos ? "is-gain" : "is-loss")}>
        {fmtPct(value)}
      </span>
    </div>
  );
}
