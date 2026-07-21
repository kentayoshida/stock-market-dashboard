"""TOPIX-17 業種別ダッシュボードのデータ生成（/topix17）。

topix17.yaml を読み → 各業種に対応する NEXT FUNDS ETF（例: 食品=1617）の価格を
yfinance（"1617.T" 形式）で取得 → 期間リターン＋モメンタムを算出 → topix17.json 出力。

33業種（build_jp.py・J-Quants 指数直取り）と異なり、上場 ETF の価格系列を使う。
期間定義・休場丸めは米国版 §3.1 と同じ（returns.py はデータ自身の営業日で asof）。

使い方:
  python build_topix17.py --source auto       # 本番（yfinance→stooq）
  python build_topix17.py --source fixture     # ローカル: 合成データで UI 検証
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
from fetch import fetch_fixture, fetch_prices  # noqa: E402
from jquants import JQuantsClient  # noqa: E402
from momentum import compute_momentum  # noqa: E402
from returns import compute_returns, latest_date  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG = ROOT / "pipeline" / "topix17.yaml"
DEFAULT_OUT = ROOT / "web" / "public" / "data" / "topix17.json"

ATTRIBUTION = (
    "TOPIX-17 等の指数値・商標は株式会社JPX総研またはその関連会社の知的財産です。"
    "ETF は NEXT FUNDS シリーズ（野村アセットマネジメント）。"
)
SOURCE_NOTE = (
    "各業種は対応する上場 ETF（NEXT FUNDS）の価格ベース。"
    "配当を含まない価格リターンのため、配当込み TOPIX-17 サブ指数とは差異があります。"
)


def load_config(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def yf_ticker(code: str) -> str:
    """4桁銘柄コード → 東証サフィックス付き yfinance ティッカー（1617 → 1617.T）。"""
    return f"{code}.T"


def _process(item: dict, price_map: dict, periods: list[str], tr_periods: list[str]) -> tuple[dict, bool]:
    """1 ETF を返り値 dict（returns＋momentum＋status）に変換。"""
    code, label = item["code"], item["label"]
    df = price_map.get(yf_ticker(code))
    base = {"label": label, "code": code, "ticker": code, "review": False}
    if df is None or df["close"].dropna().empty:
        return {**base, "status": "no_data", "as_of": None, "momentum": None,
                "returns": {p: {"price": None, "total": None} for p in periods}}, False
    rets = compute_returns(df, periods, tr_periods)
    d = latest_date(df)
    return {**base, "status": "ok", "as_of": d.isoformat() if d else None,
            "returns": rets, "momentum": compute_momentum(df["close"])}, True


def build_indices(cfg_idx: dict, source: str, periods: list[str],
                  client: JQuantsClient | None, start: date, end: date) -> dict:
    """主要指数ブロックを生成（固定順・全行%変化）。

    取得元は item ごと: source=yfinance → symbol（yfinance）/ source=jquants → index_code（J-Quants）。
    fixture 時は全 item を合成系列で代替（UI 検証用）。
    """
    items = cfg_idx.get("items", [])
    from_date, to_date = start.isoformat(), end.isoformat()

    # yfinance 取得（fixture 時は全キーを合成）
    if source == "fixture":
        keys = [it.get("symbol") or it.get("index_code") for it in items]
        price_map = fetch_fixture(keys, start, end)
    else:
        yf_symbols = [it["symbol"] for it in items
                      if it.get("source", "yfinance") == "yfinance"]
        price_map, _ = fetch_prices(yf_symbols, start, end, source=source)

    out_items: list[dict] = []
    item_dates: list[date] = []
    n_ok = n_missing = 0
    for it in items:
        src = it.get("source", "yfinance")
        key = it.get("symbol") if src == "yfinance" else it.get("index_code")
        base = {"label": it["label"], "ticker": key, "en": it.get("en"),
                "source": src, "review": False}

        series = None
        if source == "fixture":
            df = price_map.get(key)
            series = df["close"] if df is not None else None
        elif src == "jquants":
            if client is not None:
                try:
                    series = client.index_close(it["index_code"], from_date, to_date)
                except Exception as e:  # noqa: BLE001
                    print(f"[build_topix17] index {key} ({it['label']}) failed: {e}",
                          file=sys.stderr)
        else:
            df = price_map.get(key)
            series = df["close"].dropna() if df is not None else None

        if series is None or series.dropna().empty:
            n_missing += 1
            out_items.append({**base, "status": "no_data", "as_of": None, "momentum": None,
                              "returns": {p: {"price": None, "total": None} for p in periods}})
            continue
        dfp = pd.DataFrame({"close": series.astype(float), "adj_close": pd.NA})
        rets = compute_returns(dfp, periods, [])  # 価格リターンのみ
        d = latest_date(dfp)
        if d:
            item_dates.append(d)
        n_ok += 1
        out_items.append({**base, "status": "ok",
                          "as_of": d.isoformat() if d else None,
                          "returns": rets, "momentum": None})

    return {
        "id": cfg_idx["id"], "title": cfg_idx["title"],
        "columns": cfg_idx.get("columns", 2), "items": out_items,
        # 日次X画像の左パネルで使う厳選指数の並び（ticker/コード）。無ければ X は全件。
        "x_order": cfg_idx.get("x_card_indices"),
        "coverage": {"ok": n_ok, "no_data": n_missing, "total": n_ok + n_missing},
        "as_of": max(item_dates).isoformat() if item_dates else None,
    }


def build(cfg: dict, source: str, lookback_days: int) -> dict:
    periods: list[str] = cfg.get("periods", ["1D", "1M", "1Y"])
    tr_periods: list[str] = cfg.get("total_return_periods", [])
    block = cfg["block"]

    tickers = [yf_ticker(it["code"]) for it in block["items"]]
    end = date.today()
    start = end - timedelta(days=lookback_days)
    price_map, source_label = fetch_prices(tickers, start, end, source=source)

    out_items = []
    item_dates: list[date] = []
    n_ok = n_missing = 0
    for item in block["items"]:
        obj, ok = _process(item, price_map, periods, tr_periods)
        out_items.append(obj)
        if ok:
            n_ok += 1
            if obj["as_of"]:
                item_dates.append(date.fromisoformat(obj["as_of"]))
        else:
            n_missing += 1

    # ---- 主要指数（業種の上部に表示・日本市況概況）----
    indices = None
    cfg_idx = cfg.get("indices")
    if cfg_idx:
        client = None
        if source != "fixture" and any(
            it.get("source") == "jquants" for it in cfg_idx.get("items", [])
        ):
            client = JQuantsClient()
            if not client.is_configured():
                print("[build_topix17] JQUANTS_API_KEY 未設定（主要指数の一部は no_data）。",
                      file=sys.stderr)
        indices = build_indices(cfg_idx, source, periods, client, start, end)
        if indices.get("as_of"):
            item_dates.append(date.fromisoformat(indices["as_of"]))

    global_as_of = max(item_dates) if item_dates else None
    return {
        "as_of": global_as_of.isoformat() if global_as_of else None,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "data_source": source_label,
        "currency": "JPY",
        "market": "JP",
        "periods": periods,
        "total_return_periods": tr_periods,
        "sort": cfg.get("sort", {"default": "code_order"}),
        "coverage": {"ok": n_ok, "no_data": n_missing, "total": n_ok + n_missing},
        "disclaimer": "情報提供目的であり投資助言ではありません。",
        "attribution": ATTRIBUTION,
        "source_note": SOURCE_NOTE,
        "indices": indices,
        "block": {"id": block["id"], "title": block["title"],
                  "columns": block.get("columns", 3), "items": out_items},
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
    print(f"[build_topix17] source={data['data_source']} as_of={data['as_of']} "
          f"coverage={cov['ok']}/{cov['total']} (no_data={cov['no_data']})")
    print(f"[build_topix17] wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
