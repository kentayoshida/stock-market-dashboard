// latest.json のスキーマ（pipeline/src/build.py が出力する形）。

export type PeriodReturn = {
  price: number | null;
  total: number | null;
};

export type Momentum = {
  cross: "golden" | "dead" | null;
  days_since_cross: number | null;
  sma25: number;
  sma75: number;
  rsi: number | null;
  rsi_state: "overbought" | "oversold" | "neutral";
};

export type Item = {
  label: string;
  ticker: string;
  review: boolean;
  status: "ok" | "no_data";
  as_of: string | null;
  stale?: boolean;
  returns: Record<string, PeriodReturn>;
  momentum?: Momentum | null;
};

export type Block = {
  id: string;
  title: string;
  items: Item[];
};

// ---- 日本業種別（/jp-sectors）----
export type JpItem = Item & { index_code: string };

export type JpBlock = {
  id: string;
  title: string;
  columns: number;
  items: JpItem[];
};

export type JpDataset = {
  as_of: string | null;
  generated_at: string;
  data_source: string;
  currency: string;
  market: string;
  lag_note: string;
  periods: string[];
  total_return: boolean;
  sort: { default: string };
  coverage: { ok: number; no_data: number; total: number };
  disclaimer: string;
  attribution: string;
  block: JpBlock;
};

// ---- 世界 Global（/global・地域別ネスト構造）----
export type GlobalGroup = {
  region: string;
  label: string;
  items: Item[];
};

export type GlobalTier = {
  id: string;
  title: string;
  lead: Item | null;
  groups: GlobalGroup[];
};

export type GlobalDataset = {
  as_of: string | null;
  generated_at: string;
  data_source: string;
  currency: string;
  market: string;
  periods: string[];
  total_return_periods: string[];
  region_order: string[];
  region_labels: Record<string, string>;
  coverage: { ok: number; no_data: number; total: number };
  disclaimer: string;
  tiers: GlobalTier[];
};

export type Dataset = {
  as_of: string | null;
  generated_at: string;
  data_source: string;
  currency: string;
  periods: string[];
  total_return_periods: string[];
  coverage: { ok: number; no_data: number; total: number };
  disclaimer: string;
  blocks: Block[];
};
