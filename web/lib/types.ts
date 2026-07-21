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

// ---- TOPIX-17（/topix17・対応 NEXT FUNDS ETF ベース）----
export type Topix17Item = Item & { code: string }; // code = ETF 4桁銘柄コード

export type Topix17Block = {
  id: string;
  title: string;
  columns: number;
  items: Topix17Item[];
};

// 主要指数（業種の上部・日本市況概況）。ticker=シンボル/指数コード、en=英語表示名、
// source=取得元（yfinance | jquants）。全行とも価格リターン（%）。
export type JpIndexItem = Item & { en?: string; source?: string };

export type JpIndicesBlock = {
  id: string;
  title: string;
  columns: number;
  items: JpIndexItem[];
  coverage?: { ok: number; no_data: number; total: number };
  as_of?: string | null;
};

export type Topix17Dataset = {
  as_of: string | null;
  generated_at: string;
  data_source: string;
  currency: string;
  market: string;
  periods: string[];
  total_return_periods: string[];
  sort: { default: string };
  coverage: { ok: number; no_data: number; total: number };
  disclaimer: string;
  attribution: string;
  source_note: string;
  indices?: JpIndicesBlock | null;
  block: Topix17Block;
};

// ---- ダウ工業株30種（/dow30・構成30銘柄の個別株ベース）----
// 銘柄は ticker（素の米国シンボル）で識別するため、基底 Item をそのまま使う。
export type Dow30Block = {
  id: string;
  title: string;
  columns: number;
  items: Item[];
};

export type Dow30Dataset = {
  as_of: string | null;
  generated_at: string;
  data_source: string;
  currency: string;
  market: string;
  periods: string[];
  total_return_periods: string[];
  sort: { default: string };
  coverage: { ok: number; no_data: number; total: number };
  disclaimer: string;
  attribution: string;
  source_note: string;
  block: Dow30Block;
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
