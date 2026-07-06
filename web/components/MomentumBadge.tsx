"use client";

import type { Momentum } from "@/lib/types";

// ETF ベース銘柄のモメンタム・バッジ（ETF名の右）。
//  - ゴールデン/デッドクロス: SMA25×SMA75。直近(≤10営業日)の交差は「NEW」で強調。
//  - RSI(14): 買われすぎ(≥70) / 売られすぎ(≤30) / 中立。
export default function MomentumBadge({ m }: { m: Momentum | null | undefined }) {
  if (!m) return null;

  const recent =
    m.days_since_cross !== null && m.days_since_cross <= 10;

  const crossLabel = m.cross === "golden" ? "GC" : m.cross === "dead" ? "DC" : null;
  const crossArrow = m.cross === "golden" ? "▲" : "▼";
  const crossTitle =
    m.cross === "golden"
      ? "ゴールデンクロス（SMA25 > SMA75・上昇基調）"
      : "デッドクロス（SMA25 < SMA75・下降基調）";

  return (
    <span className="badges" aria-hidden="false">
      {crossLabel && (
        <span
          className={
            "badge badge--cross " +
            (m.cross === "golden" ? "is-golden" : "is-dead") +
            (recent ? " is-new" : "")
          }
          title={
            crossTitle +
            (m.days_since_cross !== null
              ? `／${m.days_since_cross}営業日前に交差`
              : "")
          }
        >
          <span className="badge-arrow">{crossArrow}</span>
          {crossLabel}
          {recent && <span className="badge-new">NEW</span>}
        </span>
      )}
      {m.rsi !== null && (
        <span
          className={
            "badge badge--rsi " +
            (m.rsi_state === "overbought"
              ? "is-ob"
              : m.rsi_state === "oversold"
              ? "is-os"
              : "is-neutral")
          }
          title={
            `RSI(14) ${m.rsi}` +
            (m.rsi_state === "overbought"
              ? "・買われすぎ"
              : m.rsi_state === "oversold"
              ? "・売られすぎ"
              : "・中立")
          }
        >
          RSI {Math.round(m.rsi)}
        </span>
      )}
    </span>
  );
}
