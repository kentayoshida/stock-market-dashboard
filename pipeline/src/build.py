"""パイプライン・オーケストレータ。

etfs.yaml を読み → 価格取得（fetch）→ 期間リターン算出（returns）→
データ品質チェック → latest.json 出力（web/public/data/latest.json）。

使い方:
  python build.py --source auto      # 本番（GitHub Actions）: yfinance→stooq
  python build.py --source fixture   # ローカル: 合成データで UI/パイプライン検証
  python build.py --source yfinance --out /path/to/latest.json
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pandas as pd
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fetch import fetch_prices  # noqa: E402
from momentum import compute_momentum  # noqa: E402
from returns import compute_returns, latest_date  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG = ROOT / "pipeline" / "etfs.yaml"
DEFAULT_OUT = ROOT / "web" / "public" / "data" / "latest.json"

# データ鮮度の許容ラグ（営業日）。これを超えて古い銘柄は stale フラグを立てる。
STALE_BUSINESS_DAYS = 5


def load_config(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def all_tickers(cfg: dict) -> list[str]:
    seen, out = set(), []
    for block in cfg.get("blocks", []):
        for item in block.get("items", []):
            t = item["ticker"]
            if t not in seen:
                seen.add(t)
                out.append(t)
    return out


def is_stale(item_as_of: date, reference: date) -> bool:
    # reference から STALE_BUSINESS_DAYS 営業日以内なら fresh。
    bdays = pd.bdate_range(end=reference, periods=STALE_BUSINESS_DAYS + 1)
    return pd.Timestamp(item_as_of) < bdays[0]


def build(cfg: dict, source: str, lookback_days: int) -> dict:
    periods: list[str] = cfg.get("periods", ["1D", "1M", "1Y"])
    tr_periods: list[str] = cfg.get("total_return_periods", ["1Y"])
    tickers = all_tickers(cfg)

    end = date.today()
    start = end - timedelta(days=lookback_days)
    price_map, source_label = fetch_prices(tickers, start, end, source=source)

    # 全銘柄の最新データ日（基準日時）。取得できた銘柄の最大値。
    item_dates = [d for d in (latest_date(df) for df in price_map.values()) if d]
    global_as_of = max(item_dates) if item_dates else None

    out_blocks = []
    n_ok = n_missing = 0
    for block in cfg.get("blocks", []):
        items = []
        for item in block.get("items", []):
            ticker = item["ticker"]
            label = item["label"]
            review = bool(item.get("review", False))
            df = price_map.get(ticker)

            if df is None or df["close"].dropna().empty:
                n_missing += 1
                items.append({
                    "label": label, "ticker": ticker, "review": review,
                    "status": "no_data", "as_of": None,
                    "returns": {p: {"price": None, "total": None} for p in periods},
                })
                continue

            rets = compute_returns(df, periods, tr_periods)
            item_as_of = latest_date(df)
            stale = bool(global_as_of and item_as_of and is_stale(item_as_of, global_as_of))
            # ETF ベース銘柄はモメンタム（SMA クロス / RSI）を算出してバッジ表示に使う。
            momentum = compute_momentum(df["close"])
            n_ok += 1
            items.append({
                "label": label, "ticker": ticker, "review": review,
                "status": "ok", "as_of": item_as_of.isoformat() if item_as_of else None,
                "stale": stale, "returns": rets, "momentum": momentum,
            })
        out_blocks.append({"id": block["id"], "title": block["title"], "items": items})

    return {
        "as_of": global_as_of.isoformat() if global_as_of else None,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "data_source": source_label,
        "currency": "USD",
        "periods": periods,
        "total_return_periods": tr_periods,
        "coverage": {"ok": n_ok, "no_data": n_missing, "total": n_ok + n_missing},
        "disclaimer": "情報提供目的であり投資助言ではありません。",
        "blocks": out_blocks,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", default="auto",
                    choices=["auto", "yfinance", "stooq", "fixture"])
    ap.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--lookback-days", type=int, default=430)
    args = ap.parse_args()

    cfg = load_config(args.config)
    data = build(cfg, source=args.source, lookback_days=args.lookback_days)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    cov = data["coverage"]
    print(f"[build] source={data['data_source']} as_of={data['as_of']} "
          f"coverage={cov['ok']}/{cov['total']} (no_data={cov['no_data']})")
    print(f"[build] wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
