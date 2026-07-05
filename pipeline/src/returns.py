"""期間リターン算出（market-dashboard-spec.md §3.1 / §3.2）。

期間定義（起点）:
  1D  = 前営業日終値
  1W  = 7カレンダー日前の直近営業日終値
  1M  = 1カレンダー月前の直近営業日終値
  3M  = 3カレンダー月前の直近営業日終値
  6M  = 6カレンダー月前の直近営業日終値
  YTD = 前年末最終営業日終値
  1Y  = 1年前の直近営業日終値

リターン％ = (最新終値 − 起点終値) ÷ 起点終値 × 100
休場丸め: 起点日が休場（データ無し）なら、その直前の営業日終値を使う（asof）。
"""
from __future__ import annotations

from datetime import date

import pandas as pd
from dateutil.relativedelta import relativedelta

# spec が定義する全期間。build.py は etfs.yaml の periods でこの部分集合を選ぶ。
ALL_PERIODS = ["1D", "1W", "1M", "3M", "6M", "YTD", "1Y"]


def _asof_close(series: pd.Series, target: pd.Timestamp) -> float | None:
    """target 日「以前」で最も新しい終値（休場丸め = 直前営業日）。"""
    s = series.loc[:target]
    if s.empty:
        return None
    val = s.iloc[-1]
    return None if pd.isna(val) else float(val)


def _start_timestamp(period: str, latest: pd.Timestamp, series: pd.Series) -> pd.Timestamp | None:
    """各期間の起点カレンダー日を返す。"""
    if period == "1D":
        # 前営業日 = 最新の1つ前のデータ点。
        idx = series.index
        pos = idx.get_indexer([latest])[0]
        return idx[pos - 1] if pos >= 1 else None
    if period == "1W":
        return latest - pd.Timedelta(days=7)
    if period == "1M":
        return latest - relativedelta(months=1)
    if period == "3M":
        return latest - relativedelta(months=3)
    if period == "6M":
        return latest - relativedelta(months=6)
    if period == "1Y":
        return latest - relativedelta(years=1)
    if period == "YTD":
        # 前年末最終営業日: 当年1/1 の直前のデータ点。
        jan1 = pd.Timestamp(year=latest.year, month=1, day=1)
        prev = series.loc[:jan1 - pd.Timedelta(days=1)]
        return prev.index[-1] if not prev.empty else None
    raise ValueError(f"unknown period: {period}")


def compute_returns(
    df: pd.DataFrame, periods: list[str], total_return_periods: list[str]
) -> dict[str, dict]:
    """1銘柄の各期間リターンを算出。

    df: columns=["close", "adj_close"], index=DatetimeIndex（営業日昇順）
    戻り値: { "1D": {"price": -0.12, "total": None}, ... }
       price = 価格リターン(Close), total = 配当込み(Adj Close, 対象期間のみ)
    """
    result: dict[str, dict] = {}
    close = df["close"].dropna().astype(float)
    if close.empty:
        return {p: {"price": None, "total": None} for p in periods}

    latest_ts = close.index[-1]
    latest_close = float(close.iloc[-1])

    adj = df["adj_close"].dropna().astype(float) if "adj_close" in df else pd.Series(dtype=float)

    for period in periods:
        entry: dict[str, float | None] = {"price": None, "total": None}
        start_ts = _start_timestamp(period, latest_ts, close)
        if start_ts is not None:
            start_close = _asof_close(close, start_ts)
            if start_close and start_close != 0:
                entry["price"] = round((latest_close - start_close) / start_close * 100, 2)

        # 配当込み（Adj Close）— 対象期間かつ Adj Close が有れば。
        if period in total_return_periods and not adj.empty:
            start_ts_adj = _start_timestamp(period, adj.index[-1], adj)
            if start_ts_adj is not None:
                start_adj = _asof_close(adj, start_ts_adj)
                latest_adj = float(adj.iloc[-1])
                if start_adj and start_adj != 0:
                    entry["total"] = round((latest_adj - start_adj) / start_adj * 100, 2)

        result[period] = entry
    return result


def latest_date(df: pd.DataFrame) -> date | None:
    close = df["close"].dropna()
    if close.empty:
        return None
    return close.index[-1].date()
