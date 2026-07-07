"""世界の株式（/global）データ生成。地域別中項目つきのネスト構造を出力。

etfs_global.yaml（先進国/新興国の2ティア × 地域 americas/europe/mea/apac）を読み、
各 ETF の期間リターン＋モメンタム（SMA クロス/RSI）を算出して global.json に出力する。
出力は tiers → groups(地域) → items のネスト構造で、フロントの地図的レイアウトに対応する。

使い方:
  python build_global.py --source auto      # 本番（yfinance→stooq）
  python build_global.py --source fixture    # ローカル UI 検証
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
DEFAULT_CONFIG = ROOT / "pipeline" / "etfs_global.yaml"
DEFAULT_OUT = ROOT / "web" / "public" / "data" / "global.json"


def load_config(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def _all_tickers(cfg: dict) -> list[str]:
    seen, out = set(), []

    def add(t: str):
        if t not in seen:
            seen.add(t)
            out.append(t)

    for tier in cfg["tiers"]:
        if tier.get("lead"):
            add(tier["lead"]["ticker"])
        for items in tier["groups"].values():
            for it in items:
                add(it["ticker"])
    return out


def _process(item: dict, price_map: dict, periods: list[str], tr_periods: list[str]):
    """1 ETF を返り値 dict（returns＋momentum＋status）に変換。"""
    ticker, label = item["ticker"], item["label"]
    df = price_map.get(ticker)
    if df is None or df["close"].dropna().empty:
        return {
            "label": label, "ticker": ticker, "review": False,
            "status": "no_data", "as_of": None, "momentum": None,
            "returns": {p: {"price": None, "total": None} for p in periods},
        }, False
    rets = compute_returns(df, periods, tr_periods)
    d = latest_date(df)
    return {
        "label": label, "ticker": ticker, "review": False,
        "status": "ok", "as_of": d.isoformat() if d else None,
        "returns": rets, "momentum": compute_momentum(df["close"]),
    }, True


def build(cfg: dict, source: str, lookback_days: int) -> dict:
    periods = cfg.get("periods", ["1D", "1M", "1Y"])
    tr_periods = cfg.get("total_return_periods", ["1Y"])
    region_order = cfg.get("region_order", [])
    region_labels = cfg.get("region_labels", {})

    tickers = _all_tickers(cfg)
    end = date.today()
    start = end - timedelta(days=lookback_days)
    price_map, source_label = fetch_prices(tickers, start, end, source=source)

    item_dates = [d for d in (latest_date(df) for df in price_map.values()) if d]
    global_as_of = max(item_dates) if item_dates else None

    n_ok = n_missing = 0
    out_tiers = []
    for tier in cfg["tiers"]:
        lead_out = None
        if tier.get("lead"):
            lead_out, ok = _process(tier["lead"], price_map, periods, tr_periods)
            n_ok, n_missing = (n_ok + 1, n_missing) if ok else (n_ok, n_missing + 1)
        groups_out = []
        for region in region_order:
            items = tier["groups"].get(region, [])
            out_items = []
            for it in items:
                obj, ok = _process(it, price_map, periods, tr_periods)
                out_items.append(obj)
                n_ok, n_missing = (n_ok + 1, n_missing) if ok else (n_ok, n_missing + 1)
            groups_out.append({
                "region": region,
                "label": region_labels.get(region, region),
                "items": out_items,
            })
        out_tiers.append({
            "id": tier["id"], "title": tier["title"],
            "lead": lead_out, "groups": groups_out,
        })

    return {
        "as_of": global_as_of.isoformat() if global_as_of else None,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "data_source": source_label,
        "currency": "USD",
        "market": "GLOBAL",
        "periods": periods,
        "total_return_periods": tr_periods,
        "region_order": region_order,
        "region_labels": region_labels,
        "coverage": {"ok": n_ok, "no_data": n_missing, "total": n_ok + n_missing},
        "disclaimer": "情報提供目的であり投資助言ではありません。",
        "tiers": out_tiers,
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
    print(f"[build_global] source={data['data_source']} as_of={data['as_of']} "
          f"coverage={cov['ok']}/{cov['total']} (no_data={cov['no_data']})")
    print(f"[build_global] wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
