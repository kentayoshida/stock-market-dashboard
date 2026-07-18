"use client";

import { useMemo, useState } from "react";
import type { Block, Item } from "@/lib/types";
import PerfRow from "./PerfRow";
import { useLang } from "./LangProvider";
import { ui, blockTitle, equityLabel } from "@/lib/i18n";

type Props = {
  block: Block;
  period: string;
  totalReturn: boolean;
  sortable?: boolean; // 東証33業種と同様に「リターン降順」で並べ替え可能にする
};

function returnFor(
  item: Item,
  period: string,
  totalReturn: boolean
): number | null {
  if (item.status !== "ok") return null;
  const r = item.returns[period];
  if (!r) return null;
  return totalReturn && r.total !== null ? r.total : r.price;
}

// ブロック内正規化: このブロック内の最大絶対リターンをバー最大長に対応させる（§4.1）。
function blockMaxAbs(
  block: Block,
  period: string,
  totalReturn: boolean
): number {
  let max = 0;
  for (const item of block.items) {
    const v = returnFor(item, period, totalReturn);
    if (v !== null) max = Math.max(max, Math.abs(v));
  }
  return max;
}

export default function HeatmapBlock({
  block,
  period,
  totalReturn,
  sortable = false,
}: Props) {
  const { lang } = useLang();
  const t = ui[lang];
  const maxAbs = blockMaxAbs(block, period, totalReturn);
  // ソートトグル: false=既定順（config 順）, true=選択期間のリターン降順（§4）
  const [sortDesc, setSortDesc] = useState(false);

  const items = useMemo(() => {
    if (!sortable || !sortDesc) return block.items; // 既定順（config 順）
    // 欠損は末尾。選択期間リターンの降順。
    return [...block.items].sort((a, b) => {
      const va = returnFor(a, period, totalReturn);
      const vb = returnFor(b, period, totalReturn);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      return vb - va;
    });
  }, [block.items, period, totalReturn, sortable, sortDesc]);

  return (
    <section className="block">
      <div className="block-head">
        <h2 className="block-title">
          {blockTitle(lang, block.id, block.title)}
        </h2>
        {sortable && (
          <div
            className="segmented sort-toggle sort-toggle--block"
            role="group"
            aria-label={t.sortAria}
          >
            <button
              type="button"
              className={"segment" + (!sortDesc ? " is-active" : "")}
              aria-pressed={!sortDesc}
              onClick={() => setSortDesc(false)}
            >
              {t.sortDefault}
            </button>
            <button
              type="button"
              className={"segment" + (sortDesc ? " is-active" : "")}
              aria-pressed={sortDesc}
              title={t.sortByReturnTitle}
              onClick={() => setSortDesc(true)}
            >
              {t.sortByReturn}
            </button>
          </div>
        )}
      </div>
      <div className="block-rows">
        {items.map((item) => (
          <PerfRow
            key={item.ticker}
            item={item}
            period={period}
            totalReturn={totalReturn}
            maxAbs={maxAbs}
            linkable
            displayLabel={equityLabel(lang, item.ticker, item.label)}
          />
        ))}
      </div>
    </section>
  );
}
