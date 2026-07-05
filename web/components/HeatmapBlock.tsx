"use client";

import type { Block } from "@/lib/types";
import PerfRow from "./PerfRow";

type Props = {
  block: Block;
  period: string;
  totalReturn: boolean;
};

// ブロック内正規化: このブロック内の最大絶対リターンをバー最大長に対応させる（§4.1）。
function blockMaxAbs(
  block: Block,
  period: string,
  totalReturn: boolean
): number {
  let max = 0;
  for (const item of block.items) {
    if (item.status !== "ok") continue;
    const r = item.returns[period];
    if (!r) continue;
    const v = totalReturn && r.total !== null ? r.total : r.price;
    if (v !== null) max = Math.max(max, Math.abs(v));
  }
  return max;
}

export default function HeatmapBlock({ block, period, totalReturn }: Props) {
  const maxAbs = blockMaxAbs(block, period, totalReturn);
  return (
    <section className="block">
      <h2 className="block-title">{block.title}</h2>
      <div className="block-rows">
        {block.items.map((item) => (
          <PerfRow
            key={item.ticker}
            item={item}
            period={period}
            totalReturn={totalReturn}
            maxAbs={maxAbs}
          />
        ))}
      </div>
    </section>
  );
}
