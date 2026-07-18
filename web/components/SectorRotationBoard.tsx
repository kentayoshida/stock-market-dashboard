"use client";

import { useMemo } from "react";
import type { Item } from "@/lib/types";
import { useLang } from "./LangProvider";
import { ui, type RotPhaseId } from "@/lib/i18n";

// 株時計の 4 位相 = 長期(1Y) × 短期(1M) リターンの符号。
//   morning 朝  : 1Y −  / 1M ＋（底打ち反発）
//   noon    昼  : 1Y ＋ / 1M ＋（上昇・牽引役）
//   evening 夕方: 1Y ＋ / 1M −（高値から調整）
//   night   夜  : 1Y −  / 1M −（夜明け前・底ばい）
function phaseOf(item: Item): RotPhaseId | null {
  if (item.status !== "ok") return null;
  const y = item.returns["1Y"]?.price;
  const m = item.returns["1M"]?.price;
  if (y == null || m == null) return null;
  if (y >= 0) return m >= 0 ? "noon" : "evening";
  return m >= 0 ? "morning" : "night";
}

function fmtPct(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

// 2×2 グリッド配置（軸に対応）: 上段=長期＋ / 下段=長期− ・ 左列=短期＋ / 右列=短期−
const GRID_ORDER: RotPhaseId[] = ["noon", "evening", "morning", "night"];

// 東証33業種（index_code キー）と米国 S&P500 セクター ETF（ticker キー）で
// 共通利用できるよう、ラベル引き・キー抽出は呼び出し側から注入する。
type Props = {
  items: Item[];
  labelFor: (item: Item) => string;
  keyOf: (item: Item) => string;
  // 個別株ページ（ダウ30 等）は数え上げ単位を「業種」→「銘柄」に切り替える。
  stocks?: boolean;
};

export default function SectorRotationBoard({
  items,
  labelFor,
  keyOf,
  stocks = false,
}: Props) {
  const { lang } = useLang();
  const t = ui[lang].rot;
  const subtitleText = stocks ? t.subtitleStocks : t.subtitle;
  const countFn = stocks ? t.countStocks : t.count;
  const excludedFn = stocks ? t.excludedStocks : t.excluded;

  const { groups, excluded } = useMemo(() => {
    const g: Record<RotPhaseId, Item[]> = {
      morning: [],
      noon: [],
      evening: [],
      night: [],
    };
    let ex = 0;
    for (const it of items) {
      const p = phaseOf(it);
      if (p) g[p].push(it);
      else ex += 1;
    }
    // 各象限は短期モメンタム（1M）の降順。強い順に並べる。
    for (const k of Object.keys(g) as RotPhaseId[]) {
      g[k].sort(
        (a, b) => (b.returns["1M"]?.price ?? 0) - (a.returns["1M"]?.price ?? 0)
      );
    }
    return { groups: g, excluded: ex };
  }, [items]);

  return (
    <section className="block rotation">
      <h2 className="block-title">{t.heading}</h2>
      <p className="rotation-sub">{subtitleText}</p>

      <div className="rotation-frame">
        <span className="rotation-ylabel">{t.longAxis}</span>
        <div className="rotation-main">
          <span className="rotation-xlabel">{t.shortAxis}</span>
          <div className="rotation-grid">
            {GRID_ORDER.map((pid) => {
              const phase = t.phases[pid];
              const cells = groups[pid];
              return (
                <div key={pid} className="rotation-cell" data-phase={pid}>
                  <div className="rotation-cell-head">
                    <span className="rotation-phase-name">{phase.name}</span>
                    <span className="rotation-phase-count">
                      {countFn(cells.length)}
                    </span>
                  </div>
                  <div className="rotation-phase-axis">{phase.axis}</div>
                  <p className="rotation-phase-desc">{phase.desc}</p>
                  <div className="rotation-chips">
                    {cells.length === 0 ? (
                      <span className="rotation-empty">{t.empty}</span>
                    ) : (
                      cells.map((it) => {
                        const y = it.returns["1Y"]?.price ?? 0;
                        const m = it.returns["1M"]?.price ?? 0;
                        const name = labelFor(it);
                        return (
                          <span
                            key={keyOf(it)}
                            className="rotation-chip"
                            title={`${name}｜1Y ${fmtPct(y)} / 1M ${fmtPct(m)}`}
                          >
                            <span className="rotation-chip-name">{name}</span>
                            <span className="rotation-chip-nums">
                              1Y {fmtPct(y)} · 1M {fmtPct(m)}
                            </span>
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="rotation-cycle">{t.cycleNote}</p>
      {excluded > 0 && <p className="rotation-note">{excludedFn(excluded)}</p>}
      <p className="rotation-source">{t.sourceNote}</p>
    </section>
  );
}
