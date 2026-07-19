"use client";

import type { Item } from "@/lib/types";
import { useLang } from "./LangProvider";
import { ui } from "@/lib/i18n";

// 52週高値からのドローダウン（DD_52WH, ≤0%）に基づく市場局面バッジ。
//  - 20%以上の下落（DD ≤ −20）: 「弱気相場（Bear market）」
//  - 10%以上の下落（DD ≤ −10）: 「調整局面（Market correction）」
//  - 20%以上のときは「弱気相場」のみ（両方は付けない）。
// 全ページの全アイテム（含む日本株）に表示。選択中の期間には依存しない状態指標。
export default function DrawdownBadge({ item }: { item: Item }) {
  const { lang } = useLang();
  const t = ui[lang];
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
