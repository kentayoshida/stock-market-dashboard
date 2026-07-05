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

// 1行 = ラベル（左）＋ リターン％ ＋ 中心0%の diverging バー（プラス=右/緑・
// マイナス=左/赤）。数値が一次情報、バーは二次情報（§4.1）。
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
        <span className="row-label" title={`${item.label}（${item.ticker}）`}>
          <span className="row-name">{item.label}</span>
        </span>
        <span className="row-nodata-msg">データなし</span>
      </div>
    );
  }

  const pos = value >= 0;
  const ratio = maxAbs > 0 ? Math.min(1, Math.abs(value) / maxAbs) : 0;
  // 中心から片側最大 50%（トラック全幅の半分）まで伸びる。
  const halfWidth = ratio * 50;
  // near-zero は淡色、絶対値が大きいほど濃色（§4.1）。
  const depth = Math.round((0.4 + 0.6 * ratio) * 100);
  const hue = pos ? "var(--gain)" : "var(--loss)";
  const fill = `color-mix(in srgb, ${hue} ${depth}%, var(--surface-2))`;

  return (
    <div className={"row" + (item.stale ? " row--stale" : "")}>
      <span className="row-label" title={`${item.label}（${item.ticker}）`}>
        <span className="row-name">{item.label}</span>
        {item.review && (
          <span className="row-flag" title="要確認: 代表ETFの選定に幅あり（Ken 判断待ち）">
            要確認
          </span>
        )}
      </span>
      <span className={"row-value " + (pos ? "is-gain" : "is-loss")}>
        {fmtPct(value)}
      </span>
      <span className="row-bar">
        <span className="row-bar-axis" />
        <span
          className={"row-bar-fill " + (pos ? "is-pos" : "is-neg")}
          style={
            pos
              ? { left: "50%", width: `${halfWidth}%`, background: fill }
              : { right: "50%", width: `${halfWidth}%`, background: fill }
          }
        />
      </span>
    </div>
  );
}
