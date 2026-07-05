# stock-market-dashboard

A dashboard designed to help retail investors visually understand market
performance and allocate assets based on sector rotation.

米国上場 ETF による市場パフォーマンス・ヒートマップ（米国版）と、東証33業種別
パフォーマンス（日本版）を、期間トグル付きで表示する Web ダッシュボード。
姉妹プロジェクト「日本版 Fear & Greed 指数」とデザイントークンを共有する。

---

## 実装状況

**Phase 1（MVP）完了** — 市場パフォーマンス・ダッシュボード（米国版）の縦断スライス:
主要米国株価指数ブロック（§2.1・16銘柄）で、取得 → 1D/1M/1Y 価格リターン算出 →
`latest.json` → ヒートマップ1ブロック表示までをエンドツーエンドで通した。
1Y の配当込み（トータルリターン）トグルも実装済み。

以降のフェーズ（全期間トグル・全ブロック・stooq フォールバック本番化・
日本業種別ページ `/jp-sectors`）は各 spec の §7 を参照。

---

## リポジトリ構成

```
pipeline/                 計算エンジン（Python）
  etfs.yaml               ETF マッピング定義（コード非依存で調整可能）
  requirements.txt
  src/
    fetch.py              価格取得: yfinance 主軸 + stooq フォールバック + fixture
    returns.py            期間リターン算出（1D/1M/1Y…, 休場丸め, YTD）
    build.py              オーケストレータ → web/public/data/latest.json
    validate_tickers.py   ティッカー実在・取得可否の検証（CI 用）
web/                      フロントエンド（Next.js + TypeScript）
  styles/design-tokens.css  共有デザイントークン（F&G と統一）
  components/             Dashboard / PeriodToggle / HeatmapBlock / PerfRow
  public/data/latest.json  パイプライン出力（cron が更新）
.github/workflows/
  update-data.yml         日次 cron: 価格取得 → latest.json 再生成 → commit
  validate-tickers.yml    手動: yfinance でティッカー検証（Summary に表出力）
```

## ローカル開発

```bash
# 1) パイプライン（このサンドボックスは市場データ host が egress 遮断されるため
#    fixture で動作確認。本番データは GitHub Actions が生成する）
pip install -r pipeline/requirements.txt
python pipeline/src/build.py --source fixture     # → web/public/data/latest.json

# 2) フロントエンド
cd web
npm install
npm run dev        # http://localhost:3000
```

`--source auto`（yfinance→stooq）は外部ネットワークが必要なため、CI か
ローカルの開放環境で実行する。

## デプロイ（Vercel）

- Vercel プロジェクトの **Root Directory を `web/`** に設定。
- 日次 cron（`update-data.yml`）が `latest.json` を再生成・commit すると、
  Vercel が commit を検知して静的再デプロイする（spec §1-6, §5）。

---

## 設計判断の記録

1. ✅ **`ダウ配当株` の代表 ETF = `SCHD`** に確定（AUM 最大／Dow Jones U.S.
   Dividend 100 連動）。候補だった DVY・SDY は不採用。
2. ✅ **`design-tokens.css` を実ファイルに統一済み**。`web/app/design-tokens.css`
   が姉妹 F&G プロジェクトの実トークン（正）。ダッシュボードは `globals.css` の
   アプリ層エイリアスで `--fg-*` を参照し、配色・型・余白を F&G と一致させている
   （gain/loss は F&G ゾーン配色を流用・§4.3）。ダークテーマはアプリ層の拡張。
3. **市場データの egress**: 開発サンドボックスから Yahoo Finance / stooq が
   403 ブロック。取得は GitHub Actions 側で実行する（本番影響なし）。ティッカー
   検証は `validate-tickers.yml`（手動実行）で行う。CI 実行で全16銘柄の取得可否を
   確認済み。

## 免責

情報提供目的であり投資助言ではありません。基準日時を UI に明示し、欠損・異常値は
「データなし」表示にしています。
