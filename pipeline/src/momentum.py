"""テクニカル・モメンタム指標（ETF ベース銘柄向け）。

ETF を参照する行（指数値を直接使う日本業種別は対象外）に、ETF名の右へ
バッジ表示する指標を算出する:
  - ゴールデンクロス / デッドクロス: SMA25 と SMA75 の位置関係。直近で交差した
    場合は days_since_cross を持たせ、UI で「NEW」強調する。
  - RSI(14, Wilder): 買われすぎ(≥70) / 売られすぎ(≤30) / 中立。

標準的なTA計算を自前実装（外部の trading-agent コードは本環境から参照不可のため）。
"""
from __future__ import annotations

import pandas as pd

SMA_FAST = 25
SMA_SLOW = 75
RSI_PERIOD = 14
RSI_OVERBOUGHT = 70
RSI_OVERSOLD = 30
CROSS_RECENT_DAYS = 10  # この営業日数以内の交差を「NEW」とみなす


def _rsi_wilder(close: pd.Series, period: int = RSI_PERIOD) -> float | None:
    if len(close) < period + 1:
        return None
    delta = close.diff()
    gain = delta.clip(lower=0.0)
    loss = -delta.clip(upper=0.0)
    # Wilder のスムージング（EMA, alpha=1/period）
    avg_gain = gain.ewm(alpha=1 / period, adjust=False).mean().iloc[-1]
    avg_loss = loss.ewm(alpha=1 / period, adjust=False).mean().iloc[-1]
    if avg_loss == 0:
        return 100.0 if avg_gain > 0 else 50.0
    rs = avg_gain / avg_loss
    return round(100.0 - 100.0 / (1.0 + rs), 1)


def compute_momentum(close: pd.Series) -> dict | None:
    """ETF の終値系列から SMA クロス状態と RSI を算出。

    戻り値:
      {
        "cross": "golden" | "dead" | None,   # SMA25 vs SMA75 の現在の位置
        "days_since_cross": int | None,       # 直近交差からの営業日数（新しいほど強調）
        "sma25": float, "sma75": float,
        "rsi": float | None,
        "rsi_state": "overbought" | "oversold" | "neutral",
      }
    データ不足時は None。
    """
    close = close.dropna().astype(float)
    if len(close) < SMA_SLOW + 1:
        return None

    sma_fast = close.rolling(SMA_FAST).mean()
    sma_slow = close.rolling(SMA_SLOW).mean()
    diff = (sma_fast - sma_slow).dropna()
    if diff.empty:
        return None

    cross = "golden" if diff.iloc[-1] >= 0 else "dead"

    # 直近の符号反転（交差）位置を探して営業日数を数える。
    sign = diff.apply(lambda x: 1 if x >= 0 else -1)
    days_since_cross = None
    for i in range(len(sign) - 1, 0, -1):
        if sign.iloc[i] != sign.iloc[i - 1]:
            days_since_cross = (len(sign) - 1) - i
            break

    rsi = _rsi_wilder(close)
    if rsi is None:
        rsi_state = "neutral"
    elif rsi >= RSI_OVERBOUGHT:
        rsi_state = "overbought"
    elif rsi <= RSI_OVERSOLD:
        rsi_state = "oversold"
    else:
        rsi_state = "neutral"

    return {
        "cross": cross,
        "days_since_cross": days_since_cross,
        "sma25": round(float(sma_fast.iloc[-1]), 2),
        "sma75": round(float(sma_slow.iloc[-1]), 2),
        "rsi": rsi,
        "rsi_state": rsi_state,
    }
