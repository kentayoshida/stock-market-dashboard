"""J-Quants API v2 クライアント（日本業種別ダッシュボード用・独立モジュール）。

jp-sector-dashboard-spec.md §3, §6。姉妹プロジェクト（日本版 F&G 指数）の
J-Quants クライアントと同型で、本リポジトリ内に独立実装する（将来共通化の余地）。

v2 認証（1段階・トークン交換不要）:
  - ダッシュボード発行の API キーを `x-api-key` ヘッダーに載せる
  - ベースURL: https://api.jquants.com/v2
  - 認証情報は環境変数 / GitHub Secrets: JQUANTS_API_KEY（後方互換 JQUANTS_REFRESH_TOKEN）

業種別TOPIX の指数値取得（分岐A）:
  - GET /indices/bars/daily?code=<index_code>&from=&to=
  - レスポンス {"data": [...], "pagination_key": "..."}、Date + Close(あるいは C) 列。
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import pandas as pd
import requests

DEFAULT_BASE_URL = "https://api.jquants.com/v2"


class JQuantsError(RuntimeError):
    pass


def _api_key() -> str | None:
    return os.environ.get("JQUANTS_API_KEY") or os.environ.get("JQUANTS_REFRESH_TOKEN")


class JQuantsClient:
    """J-Quants v2 クライアント。API キーを x-api-key ヘッダーで送るだけ。"""

    def __init__(self, base_url: str | None = None, timeout: int = 30) -> None:
        self.base_url = (base_url or os.environ.get("JQUANTS_BASE_URL") or DEFAULT_BASE_URL).rstrip("/")
        self.timeout = timeout
        self.api_key = _api_key()

    @staticmethod
    def is_configured() -> bool:
        return bool(_api_key())

    def _headers(self) -> dict[str, str]:
        if not self.api_key:
            raise JQuantsError(
                "J-Quants APIキー未設定（JQUANTS_API_KEY もしくは JQUANTS_REFRESH_TOKEN を設定）"
            )
        return {"x-api-key": self.api_key}

    def _get(self, path: str, params: dict | None = None) -> list[dict]:
        headers = self._headers()
        params = {k: v for k, v in (params or {}).items() if v is not None}
        out: list[dict] = []
        while True:
            resp = requests.get(
                f"{self.base_url}{path}", headers=headers, params=params, timeout=self.timeout
            )
            resp.raise_for_status()
            body = resp.json()
            data = body.get("data")
            if data is None:
                data = next((v for v in body.values() if isinstance(v, list)), [])
            out.extend(data)
            pagination = body.get("pagination_key")
            if not pagination:
                break
            params["pagination_key"] = pagination
        return out

    @staticmethod
    def _find_col(columns, *candidates: str) -> str | None:
        cols = list(columns)
        lower = {c.lower(): c for c in cols}
        for cand in candidates:
            if cand in cols:
                return cand
            if cand.lower() in lower:
                return lower[cand.lower()]
        for cand in candidates:
            for c in cols:
                if cand.lower() in c.lower():
                    return c
        return None

    def index_close(self, code: str, from_date: str | None = None,
                    to_date: str | None = None) -> pd.Series:
        """指数終値系列（業種別TOPIX の指数値）。/indices/bars/daily から取得。

        code は指数コード（例 0000=TOPIX、0040〜0072=33業種別TOPIX 候補）。
        Date と Close(略記 C も可) を頑健に検出して昇順の Series を返す。
        """
        rows = self._get("/indices/bars/daily", {"code": code, "from": from_date, "to": to_date})
        if not rows:
            raise JQuantsError(f"index_close: no data for code={code}")
        df = pd.DataFrame(rows)
        date_col = self._find_col(df.columns, "Date")
        close_col = self._find_col(df.columns, "Close", "C", "AdjustmentClose")
        if not date_col or not close_col:
            raise JQuantsError(
                f"index_close: Date/Close 列が見つからない columns={list(df.columns)}"
            )
        s = pd.Series(
            pd.to_numeric(df[close_col], errors="coerce").values,
            index=pd.to_datetime(df[date_col]),
        ).dropna().sort_index()
        s.index = s.index.tz_localize(None).normalize()
        return s


def now_jst_date() -> str:
    """JST の本日日付（YYYY-MM-DD）。"""
    return (datetime.now(timezone.utc) + timedelta(hours=9)).strftime("%Y-%m-%d")
