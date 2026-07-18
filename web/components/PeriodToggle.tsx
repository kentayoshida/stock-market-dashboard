"use client";

import { useLang } from "./LangProvider";
import { ui } from "@/lib/i18n";

type Props = {
  periods: string[];
  value: string;
  onChange: (p: string) => void;
  showTotalReturn: boolean;
  totalReturn: boolean;
  onToggleTotalReturn: (v: boolean) => void;
};

// 52 週レンジ指標のトグル表示名（日英とも同じ表記・ユーザー指定）。
// 通常の期間キー（1D…1Y）はキーをそのまま表示する。
const METRIC_LABELS: Record<string, string> = {
  DD_52WH: "Drawdown from 52-week-high",
  UP_52WL: "Gain from 52-week-low",
};

// 期間セグメントトグル（§4.2）。1Y 選択時のみ「配当込み」サブトグルを表示。
export default function PeriodToggle({
  periods,
  value,
  onChange,
  showTotalReturn,
  totalReturn,
  onToggleTotalReturn,
}: Props) {
  const { lang } = useLang();
  const t = ui[lang];
  return (
    <div className="toggle-bar">
      <div className="segmented" role="tablist" aria-label={t.periodAria}>
        {periods.map((p) => {
          const isMetric = p in METRIC_LABELS;
          return (
            <button
              key={p}
              role="tab"
              aria-selected={p === value}
              className={
                "segment" +
                (isMetric ? " segment--metric" : "") +
                (p === value ? " is-active" : "")
              }
              onClick={() => onChange(p)}
            >
              {METRIC_LABELS[p] ?? p}
            </button>
          );
        })}
      </div>

      {showTotalReturn && (
        <label className="tr-toggle" title={t.totalReturnTitle}>
          <input
            type="checkbox"
            checked={totalReturn}
            onChange={(e) => onToggleTotalReturn(e.target.checked)}
          />
          <span>{t.totalReturn}</span>
        </label>
      )}
    </div>
  );
}
