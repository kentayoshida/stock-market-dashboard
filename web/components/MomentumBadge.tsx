"use client";

import type { Momentum } from "@/lib/types";
import { useLang } from "./LangProvider";
import { ui } from "@/lib/i18n";

// ETF ベース銘柄のモメンタム・バッジ（ETF名の右）。
//  - ゴールデン/デッドクロス: SMA25×SMA75。直近(≤10営業日)の交差は「NEW」で強調。
//  - RSI(14): 買われすぎ(≥70) / 売られすぎ(≤30) / 中立。
export default function MomentumBadge({ m }: { m: Momentum | null | undefined }) {
  const { lang } = useLang();
  const t = ui[lang];
  if (!m) return null;

  const recent =
    m.days_since_cross !== null && m.days_since_cross <= 10;

  const crossLabel = m.cross === "golden" ? "GC" : m.cross === "dead" ? "DC" : null;
  const crossArrow = m.cross === "golden" ? "▲" : "▼";
  const crossTitle = m.cross === "golden" ? t.goldenTitle : t.deadTitle;

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
              ? t.crossedDaysAgo(m.days_since_cross)
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
              ? t.rsiOverbought
              : m.rsi_state === "oversold"
              ? t.rsiOversold
              : t.rsiNeutral)
          }
        >
          RSI {Math.round(m.rsi)}
        </span>
      )}
    </span>
  );
}
