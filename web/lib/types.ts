// latest.json のスキーマ（pipeline/src/build.py が出力する形）。

export type PeriodReturn = {
  price: number | null;
  total: number | null;
};

export type Item = {
  label: string;
  ticker: string;
  review: boolean;
  status: "ok" | "no_data";
  as_of: string | null;
  stale?: boolean;
  returns: Record<string, PeriodReturn>;
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
