"use client";

import type { Item } from "@/lib/types";
import { useLang } from "./LangProvider";
import { ui } from "@/lib/i18n";

// 52週高値からのドローダウン（DD_52WH, ≤0%）に基づく市場局面バッジ。
//  - 20%以上の下落（DD ≤ −20）: 「弱気相場（Bear market）」
//  - 10%以上の下落（DD ≤ −10）: 「調整局面（Market correction）」
//  - 20%以上のときは「弱気相場」のみ（両方は付けない）。
// 全ページの全アイテム（含む日本株）に表示。選択中の期間には依存しない状態指標。

// ボラティリティ指数（日経VI 等）は「52週高値からのドローダウン」の概念が馴染まない
// （暴落時に高値更新・平常時は高値から大きく低下）ため、局面バッジの対象外にする。日英共通。
const NO_REGIME_BADGE_TICKERS = new Set(["^NKVI.OS"]);

export default function DrawdownBadge({ item }: { item: Item }) {
  const { lang } = useLang();
  const t = ui[lang];
  if (NO_REGIME_BADGE_TICKERS.has(item.ticker)) return null;
  const dd = item.returns?.["DD_52WH"]?.price;
  if (dd === null || dd === undefined) return null;

  if (dd <= -20) {
    return (
      <span className="badge badge--regime is-bear" title={t.bearMarketTitle(dd)}>
        {t.bearMarket}
      </span>
    );
  }
  if (dd <= -10) {
    return (
      <span
        className="badge badge--regime is-correction"
        title={t.correctionTitle(dd)}
      >
        {t.correction}
      </span>
    );
  }
  return null;
}
