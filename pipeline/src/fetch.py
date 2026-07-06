"""価格データ取得層。

市場パフォーマンス・ダッシュボード spec §1-3 / §3.3:
  - yfinance を主軸、stooq をフォールバック兼クロスチェックに使う（IBKR 不使用）。
  - 米国上場 ETF の価格系列のみ（Close / Adj Close）。財務加工データは使わない。

各アダプタは ticker -> DataFrame(index=DatetimeIndex, columns=["close", "adj_close"])
を返す。取得できなければ ticker をキーに含めない（build 側で「データなし」判定）。

注意: この開発サンドボックスは egress ポリシーで Yahoo Finance / stooq への
到達が 403 ブロックされている。実データ取得は GitHub Actions の日次 cron 側で
走らせる設計（spec §1-6, §5）。ローカル検証用に FIXTURE ソースを用意する。
"""
from __future__ import annotations

import io
import math
import sys
from datetime import date, datetime, timedelta

import pandas as pd

USER_AGENT = "market-dashboard/0.1 (+https://github.com/kentayoshida/stock-market-dashboard)"


# --------------------------------------------------------------------------- #
# yfinance（主軸）
# --------------------------------------------------------------------------- #
def fetch_yfinance(tickers: list[str], start: date, end: date) -> dict[str, pd.DataFrame]:
    import yfinance as yf

    out: dict[str, pd.DataFrame] = {}
    # auto_adjust=False で Close（価格）と Adj Close（配当込み）の両方を得る。
    raw = yf.download(
        tickers=tickers,
        start=start.isoformat(),
        end=(end + timedelta(days=1)).isoformat(),
        interval="1d",
        auto_adjust=False,
        actions=False,
        progress=False,
        threads=True,
        group_by="ticker",
    )
    if raw is None or len(raw) == 0:
        return out

    for t in tickers:
        try:
            if isinstance(raw.columns, pd.MultiIndex):
                sub = raw[t]
            else:  # 単一ティッカー時はフラットな columns
                sub = raw
            close = sub["Close"].dropna()
            adj = sub["Adj Close"].dropna() if "Adj Close" in sub else pd.Series(dtype=float)
            if close.empty:
                continue
            df = pd.DataFrame({"close": close, "adj_close": adj})
            df.index = pd.to_datetime(df.index).tz_localize(None).normalize()
            out[t] = df.sort_index()
        except (KeyError, TypeError):
            continue
    return out


# --------------------------------------------------------------------------- #
# stooq（フォールバック） — 調整後終値は提供されないため close のみ（価格リターン用）
# --------------------------------------------------------------------------- #
def fetch_stooq(tickers: list[str], start: date, end: date) -> dict[str, pd.DataFrame]:
    import urllib.request

    out: dict[str, pd.DataFrame] = {}
    for t in tickers:
        url = (
            f"https://stooq.com/q/d/l/?s={t.lower()}.us&i=d"
            f"&d1={start.strftime('%Y%m%d')}&d2={end.strftime('%Y%m%d')}"
        )
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=30) as resp:
                body = resp.read().decode("utf-8")
            if not body or body.strip().startswith("<") or "Date,Open" not in body:
                continue
            df = pd.read_csv(io.StringIO(body))
            if "Close" not in df or df.empty:
                continue
            df["Date"] = pd.to_datetime(df["Date"]).dt.normalize()
            df = df.set_index("Date").sort_index()
            # stooq は調整後終値を持たないため adj_close は NaN。
            out[t] = pd.DataFrame({"close": df["Close"], "adj_close": pd.NA}, index=df.index)
        except Exception:
            continue
    return out


# --------------------------------------------------------------------------- #
# FIXTURE（オフライン開発用の合成データ・決定論的）
# --------------------------------------------------------------------------- #
def fetch_fixture(tickers: list[str], start: date, end: date) -> dict[str, pd.DataFrame]:
    """Yahoo/stooq に到達できない環境で UI/パイプラインを検証するための合成系列。

    実データではない。build.py は data_source="fixture" をメタに記録し、
    UI からも「サンプルデータ」と分かるようにする。
    """
    bdays = pd.bdate_range(start=start, end=end)
    out: dict[str, pd.DataFrame] = {}
    for i, t in enumerate(sorted(tickers)):
        seed = (sum(ord(c) for c in t) + i) % 997
        base = 50.0 + (seed % 400)
        # 銘柄ごとにトレンドの向き・強さ・ボラを散らし、SMA クロスや RSI が
        # ばらつくようにする（バッジ表示の検証用）。
        drift = ((seed % 11) - 5) * 0.0011          # 強い上昇〜強い下落
        regime = math.sin((seed % 13) / 2.0)        # 中盤でトレンド反転する銘柄も
        amp = 0.8 + (seed % 5) * 0.35
        vol = 0.4 + (seed % 7) * 0.12
        closes, adj = [], []
        price = base
        for n in range(len(bdays)):
            phase = n / max(1, len(bdays))
            local_drift = drift * (1 + regime * math.cos(phase * math.pi))
            wave = math.sin((n + seed) / 9.0) * amp + math.sin((n + seed) / 2.3) * vol
            price = max(1.0, price * (1 + local_drift) + wave * 0.06)
            closes.append(round(price, 2))
            adj.append(round(price * (1 + 0.015 * n / max(1, len(bdays))), 2))
        out[t] = pd.DataFrame({"close": closes, "adj_close": adj}, index=bdays)
    return out


# --------------------------------------------------------------------------- #
# 統合フェッチャ: yfinance → 欠けた銘柄のみ stooq で補完
# --------------------------------------------------------------------------- #
def fetch_prices(
    tickers: list[str], start: date, end: date, source: str = "auto"
) -> tuple[dict[str, pd.DataFrame], str]:
    """(price_map, source_label) を返す。

    source: "auto"（yfinance→stooq補完）| "yfinance" | "stooq" | "fixture"
    """
    if source == "fixture":
        return fetch_fixture(tickers, start, end), "fixture"
    if source == "stooq":
        return fetch_stooq(tickers, start, end), "stooq"
    if source == "yfinance":
        return fetch_yfinance(tickers, start, end), "yfinance"

    # auto: yfinance を主軸に、取得できなかった銘柄だけ stooq で補完。
    primary: dict[str, pd.DataFrame] = {}
    try:
        primary = fetch_yfinance(tickers, start, end)
    except Exception as e:  # noqa: BLE001
        print(f"[fetch] yfinance failed wholesale: {e}", file=sys.stderr)

    missing = [t for t in tickers if t not in primary]
    if missing:
        print(f"[fetch] stooq fallback for {len(missing)} tickers: {missing}", file=sys.stderr)
        try:
            fb = fetch_stooq(missing, start, end)
            primary.update(fb)
        except Exception as e:  # noqa: BLE001
            print(f"[fetch] stooq fallback failed: {e}", file=sys.stderr)

    label = "yfinance+stooq" if missing else "yfinance"
    return primary, label
