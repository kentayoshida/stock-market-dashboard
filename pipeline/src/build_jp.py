"""日本業種別ダッシュボードのデータ生成（jp-sector-dashboard-spec.md §3, §5, §6）。

sectors_jp.yaml を読み → J-Quants /indices/bars/daily で33業種別TOPIX の指数値を
取得 → 期間リターン算出（returns.py 共通ロジック・§5）→ jp_sectors.json 出力。

期間定義・休場丸めは米国版 §3.1 と同じ（returns.py はデータ自身の営業日でasof するため
日本市場カレンダーに自動追従）。全期間・価格リターンのみ（配当込みは Premium 未契約で断念）。

使い方:
  python build_jp.py --source jquants   # 本番（要 JQUANTS_API_KEY）
  python build_jp.py --source fixture    # ローカル: 合成データで UI 検証
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pandas as pd
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from jquants import JQuantsClient, JQuantsError  # noqa: E402
from returns import compute_returns, latest_date  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG = ROOT / "pipeline" / "sectors_jp.yaml"
DEFAULT_OUT = ROOT / "web" / "public" / "data" / "jp_sectors.json"

ATTRIBUTION = "TOPIX 等の指数値・商標は株式会社JPX総研またはその関連会社の知的財産です。"
LAG_NOTE = "J-Quants は翌営業日更新のため、最新値は前営業日ぶん（1営業日ラグ）です。"


def load_config(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def _fixture_series(index_code: str, start: date, end: date) -> pd.Series:
    bdays = pd.bdate_range(start=start, end=end)
    seed = (sum(ord(c) for c in index_code) * 7) % 997
    base = 800.0 + (seed % 1500)
    drift = ((seed % 9) - 4) * 0.0003
    amp = 0.5 + (seed % 6) * 0.2
    price = base
    vals = []
    for n in range(len(bdays)):
        wave = math.sin((n + seed) / 13.0) * amp + math.sin((n + seed) / 4.0) * amp * 0.3
        price = max(10.0, price * (1 + drift) + wave)
        vals.append(round(price, 2))
    return pd.Series(vals, index=bdays)


def _series_for(item: dict, client: JQuantsClient | None, source: str,
                from_date: str, to_date: str, start: date, end: date) -> pd.Series | None:
    code = item["index_code"]
    if source == "fixture":
        return _fixture_series(code, start, end)
    try:
        return client.index_close(code, from_date=from_date, to_date=to_date)
    except (JQuantsError, Exception) as e:  # noqa: BLE001
        print(f"[build_jp] index {code} ({item['label']}) failed: {e}", file=sys.stderr)
        return None


def build(cfg: dict, source: str, lookback_days: int) -> dict:
    periods: list[str] = cfg.get("periods", ["1D", "1M", "1Y"])
    block = cfg["block"]
    end = date.today()
    start = end - timedelta(days=lookback_days)
    from_date, to_date = start.isoformat(), end.isoformat()

    client = None
    if source == "jquants":
        client = JQuantsClient()
        if not client.is_configured():
            print("[build_jp] JQUANTS_API_KEY 未設定。", file=sys.stderr)

    out_items = []
    item_dates: list[date] = []
    n_ok = n_missing = 0
    for item in block["items"]:
        s = _series_for(item, client, source, from_date, to_date, start, end)
        base = {
            "label": item["label"],
            "ticker": item["sector33_code"],       # PerfRow のツールチップ用（業種コード）
            "index_code": item["index_code"],
            "review": False,
        }
        if s is None or s.empty:
            n_missing += 1
            out_items.append({**base, "status": "no_data", "as_of": None,
                              "returns": {p: {"price": None, "total": None} for p in periods}})
            continue
        df = pd.DataFrame({"close": s.astype(float), "adj_close": pd.NA})
        rets = compute_returns(df, periods, total_return_periods=[])  # 価格リターンのみ
        d = latest_date(df)
        if d:
            item_dates.append(d)
        n_ok += 1
        out_items.append({**base, "status": "ok",
                          "as_of": d.isoformat() if d else None, "returns": rets})

    global_as_of = max(item_dates) if item_dates else None
    return {
        "as_of": global_as_of.isoformat() if global_as_of else None,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "data_source": source,
        "currency": "JPY",
        "market": "JP",
        "lag_note": LAG_NOTE,
        "periods": periods,
        "total_return": bool(cfg.get("total_return", False)),
        "sort": cfg.get("sort", {"default": "code_order"}),
        "coverage": {"ok": n_ok, "no_data": n_missing, "total": n_ok + n_missing},
        "disclaimer": "情報提供目的であり投資助言ではありません。",
        "attribution": ATTRIBUTION,
        "block": {"id": block["id"], "title": block["title"],
                  "columns": block.get("columns", 3), "items": out_items},
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", default="jquants", choices=["jquants", "fixture"])
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
    print(f"[build_jp] source={data['data_source']} as_of={data['as_of']} "
          f"coverage={cov['ok']}/{cov['total']} (no_data={cov['no_data']})")
    print(f"[build_jp] wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
