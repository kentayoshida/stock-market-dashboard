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
        {periods.map((p) => (
          <button
            key={p}
            role="tab"
            aria-selected={p === value}
            className={"segment" + (p === value ? " is-active" : "")}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        ))}
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
