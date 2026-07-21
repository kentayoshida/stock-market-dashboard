// 日本語(既定)/英語の 2 言語対応。
//  - UI チャロム（見出し・トグル・フッター等）は下の `ui` 辞書。
//  - 銘柄/業種ラベルは ticker（米国・世界）/ index_code（日本）でキー引き。
//  - 東証33業種の英名は JPX 公式（sectors PDF）に準拠。
// データ JSON は無改変。フロント側のみで言語切替（即時・リビルド不要）。

export type Lang = "ja" | "en";

// ---- 株時計（セクターローテーション）辞書 ----
// 4 位相 = 長期(1Y)×短期(1M)リターンの符号。株時計の朝/昼/夕方/夜に対応。
export type RotPhaseId = "morning" | "noon" | "evening" | "night";
type RotPhase = { name: string; axis: string; desc: string };
type RotDict = {
  heading: string;
  subtitle: string;
  sourceNote: string;
  cycleNote: string;
  longAxis: string; // 縦軸ラベル（長期 1Y）
  shortAxis: string; // 横軸ラベル（短期 1M）
  count: (n: number) => string;
  empty: string;
  excluded: (n: number) => string;
  phases: Record<RotPhaseId, RotPhase>;
  // 個別株を並べるページ（ダウ30 等）向けの「業種」→「銘柄」差し替え版（任意）。
  subtitleStocks: string;
  countStocks: (n: number) => string;
  excludedStocks: (n: number) => string;
};

// ---- UI チャロム辞書 ----
type UIDict = {
  brandTitle: string;
  brandSub: string;
  navUs: string;
  navGlobal: string;
  navJp: string;
  navTopix17: string;
  navDow: string;
  langLabel: string; // 言語トグルの aria-label
  // hero / meta
  asOf: string;
  denomUsListed: (cur: string) => string; // 「USD 建て・米国上場 ETF」
  denom: (cur: string) => string; // 「JPY 建て」
  coverTickers: (ok: number, total: number) => string;
  coverSectors: (ok: number, total: number) => string;
  oneDayLag: string;
  // banners / notes
  sampleUs: string;
  sampleJp: string;
  sampleTopix17: string;
  sampleDow: string;
  trNote: string;
  // toggles
  periodAria: string;
  totalReturn: string;
  totalReturnTitle: string;
  sortAria: string;
  sortByCode: string;
  sortByTicker: string;
  sortDefault: string;
  sortByReturn: string;
  sortByReturnTitle: string;
  // rows / badges
  noData: string;
  review: string;
  reviewTitle: string;
  goldenTitle: string;
  deadTitle: string;
  crossedDaysAgo: (n: number) => string;
  rsiOverbought: string;
  rsiOversold: string;
  rsiNeutral: string;
  bearMarket: string;
  bearMarketTitle: (dd: number) => string;
  correction: string;
  correctionTitle: (dd: number) => string;
  // hero titles per page
  heroUs: string;
  heroGlobal: string;
  heroJp: string;
  heroTopix17: string;
  heroDow: string;
  majorIndices: string;
  // footer
  disclaimer: string;
  jpAttribution: string;
  jpLagNote: string;
  topixAttribution: string;
  topixSourceNote: string;
  dowAttribution: string;
  dowSourceNote: string;
  updatedAt: string;
  source: string;
  homeAria: string;
  rot: RotDict;
  portal: {
    sub: string;
    intro: string;
    dashTitle: string;
    dashDesc: string;
    jfgiTitle: string;
    jfgiDesc: string;
    visit: string;
    funHeading: string;
    funNote: string;
    namaeTitle: string;
    namaeDesc: string;
    devilTitle: string;
    devilDesc: string;
    mansionTitle: string;
    mansionDesc: string;
  };
};

export const ui: Record<Lang, UIDict> = {
  ja: {
    brandTitle: "市場パフォーマンス",
    brandSub: "Market Performance Dashboard",
    navUs: "米国 US",
    navGlobal: "世界 Global",
    navJp: "日本業種別 JP",
    navTopix17: "TOPIX-17",
    navDow: "ダウ30",
    langLabel: "言語切替",
    asOf: "基準日",
    denomUsListed: (cur) => `${cur} 建て・米国上場 ETF`,
    denom: (cur) => `${cur} 建て`,
    coverTickers: (ok, total) => `採用 ${ok}/${total} 銘柄`,
    coverSectors: (ok, total) => `採用 ${ok}/${total} 業種`,
    oneDayLag: "1営業日ラグ",
    sampleUs:
      "⚠ 現在表示中はサンプルデータ（fixture）です。実データは日次バッチ（yfinance）が生成します。",
    sampleJp:
      "⚠ 現在表示中はサンプルデータ（fixture）です。実データは日次バッチ（J-Quants）が生成します。",
    sampleTopix17:
      "⚠ 現在表示中はサンプルデータ（fixture）です。実データは日次バッチ（yfinance）が生成します。",
    sampleDow:
      "⚠ 現在表示中はサンプルデータ（fixture）です。実データは日次バッチ（yfinance）が生成します。",
    trNote:
      "「配当込み」は調整後終値（Adj Close）由来のトータルリターン。他期間は価格リターン（終値ベース）。",
    periodAria: "期間",
    totalReturn: "配当込み",
    totalReturnTitle: "配当込み（トータルリターン, Adj Close）",
    sortAria: "並び替え",
    sortByCode: "業種コード順",
    sortByTicker: "ティッカー順",
    sortDefault: "既定順",
    sortByReturn: "リターン降順",
    sortByReturnTitle: "選択中の期間のリターンが高い順",
    noData: "データなし",
    review: "要確認",
    reviewTitle: "要確認: 代表ETFの選定に幅あり（Ken 判断待ち）",
    goldenTitle: "ゴールデンクロス（SMA25 > SMA75・上昇基調）",
    deadTitle: "デッドクロス（SMA25 < SMA75・下降基調）",
    crossedDaysAgo: (n) => `／${n}営業日前に交差`,
    rsiOverbought: "・買われすぎ",
    rsiOversold: "・売られすぎ",
    rsiNeutral: "・中立",
    bearMarket: "弱気相場",
    bearMarketTitle: (dd) =>
      `52週高値から ${dd.toFixed(2)}% 下落（20%以上の下落＝弱気相場 / Bear market）`,
    correction: "調整局面",
    correctionTitle: (dd) =>
      `52週高値から ${dd.toFixed(2)}% 下落（10%以上の下落＝調整局面 / Market correction）`,
    heroUs: "主要米国株価指数",
    heroGlobal: "世界の株式",
    heroJp: "東証33業種",
    heroTopix17: "TOPIX-17（17業種）",
    majorIndices: "主要指数",
    heroDow: "ダウ工業株30種",
    disclaimer: "情報提供目的であり投資助言ではありません。",
    jpAttribution:
      "TOPIX 等の指数値・商標は株式会社JPX総研またはその関連会社の知的財産です。",
    jpLagNote:
      "J-Quants は翌営業日更新のため、最新値は前営業日ぶん（1営業日ラグ）です。",
    topixAttribution:
      "TOPIX-17 等の指数値・商標は株式会社JPX総研またはその関連会社の知的財産です。ETF は NEXT FUNDS シリーズ（野村アセットマネジメント）。",
    topixSourceNote:
      "各業種は対応する上場 ETF（NEXT FUNDS）の価格ベース。配当を含まない価格リターンのため、配当込み TOPIX-17 サブ指数とは差異があります。",
    dowAttribution:
      "「ダウ・ジョーンズ工業株価平均（Dow Jones Industrial Average）」等の商標は S&P Dow Jones Indices LLC の知的財産です。本ページは指数そのものではなく、構成30銘柄それぞれの個別株価に基づきます。",
    dowSourceNote:
      "構成銘柄は手動更新（入れ替えは年に数回）。株価は yfinance。配当込みリターン（1Y）は調整後終値（Adj Close）由来の近似です。",
    updatedAt: "データ更新",
    source: "出所",
    homeAria: "市場パフォーマンス ホーム",
    rot: {
      heading: "セクターローテーション（株時計）",
      subtitle:
        "各業種を長期（1Y）×短期（1M）リターンの符号で4象限に分類。株時計の 朝→昼→夕方→夜 の循環に対応します。",
      sourceNote:
        "「株時計」は山和証券・志田憲太郎氏が提唱するコンセプト。本図は価格リターンによる定量近似で、本来の業績予想ベースの位置付けとは異なる場合があります。循環は必ずしも規則的に回転しません。",
      cycleNote: "循環：🌅 朝 → ☀️ 昼 → 🌆 夕方 → 🌙 夜",
      longAxis: "長期トレンド（1Y）",
      shortAxis: "短期モメンタム（1M）",
      count: (n) => `${n}業種`,
      empty: "該当なし",
      excluded: (n) => `※ データ不足の ${n} 業種は非表示`,
      subtitleStocks:
        "各銘柄を長期（1Y）×短期（1M）リターンの符号で4象限に分類。株時計の 朝→昼→夕方→夜 の循環に対応します。",
      countStocks: (n) => `${n}銘柄`,
      excludedStocks: (n) => `※ データ不足の ${n} 銘柄は非表示`,
      phases: {
        morning: {
          name: "🌅 朝｜夜明け（底打ち反発）",
          axis: "1Y − ／ 1M ＋",
          desc: "業績好転の兆し。逆張りで底入れからの反転を狙う局面。",
        },
        noon: {
          name: "☀️ 昼｜日中（上昇・牽引役）",
          axis: "1Y ＋ ／ 1M ＋",
          desc: "業績好調で相場の牽引役。順張りの本命。",
        },
        evening: {
          name: "🌆 夕方（高値から調整）",
          axis: "1Y ＋ ／ 1M −",
          desc: "業績は悪くないが株価は調整局面。利益確定が優勢。",
        },
        night: {
          name: "🌙 夜｜夜明け前（底ばい）",
          axis: "1Y − ／ 1M −",
          desc: "本格反転にはまだ時間。下落・停滞が続きやすい。",
        },
      },
    },
    portal: {
      sub: "マーケットデータ・ラボ",
      intro: "マーケットのパフォーマンスとセンチメントを、シンプルに可視化。",
      dashTitle: "市場パフォーマンス・ダッシュボード",
      dashDesc:
        "米国・世界（地域別）・東証33業種の期間別パフォーマンスを、ヒートマップと株時計で表示。",
      jfgiTitle: "日本版 Fear & Greed 指数",
      jfgiDesc: "日本市場の投資家心理（恐怖と貪欲）を1つの指数で可視化。",
      visit: "開く →",
      funHeading: "おまけ（趣味の個人開発）",
      funNote:
        "マーケットラボの本旨とは別の、趣味で作った個人開発サイトです。",
      namaeTitle: "名前ラボ",
      namaeDesc:
        "あなたとパートナーが、お子さんの名前を納得して決めるためのアプリです。",
      devilTitle: "悪魔の実メーカー",
      devilDesc: "あなたの名前から、あなただけの悪魔の実が判明する。",
      mansionTitle: "マンションポエムメーカー",
      mansionDesc:
        "駅名を入れると、その街の空気をまとった架空の「マンションポエム」を生成します。",
    },
  },
  en: {
    brandTitle: "Market Performance",
    brandSub: "Market Performance Dashboard",
    navUs: "US",
    navGlobal: "Global",
    navJp: "Japan Sectors",
    navTopix17: "TOPIX-17",
    navDow: "Dow 30",
    langLabel: "Switch language",
    asOf: "As of",
    denomUsListed: (cur) => `in ${cur} · U.S.-listed ETFs`,
    denom: (cur) => `in ${cur}`,
    coverTickers: (ok, total) => `${ok}/${total} tickers`,
    coverSectors: (ok, total) => `${ok}/${total} sectors`,
    oneDayLag: "1-day lag",
    sampleUs:
      "⚠ Showing sample data (fixture). Real data is generated by the daily batch (yfinance).",
    sampleJp:
      "⚠ Showing sample data (fixture). Real data is generated by the daily batch (J-Quants).",
    sampleTopix17:
      "⚠ Showing sample data (fixture). Real data is generated by the daily batch (yfinance).",
    sampleDow:
      "⚠ Showing sample data (fixture). Real data is generated by the daily batch (yfinance).",
    trNote:
      "“Total Return” is derived from adjusted close (Adj Close). Other periods use price return (close-based).",
    periodAria: "Period",
    totalReturn: "Total Return",
    totalReturnTitle: "Total return (dividends reinvested, Adj Close)",
    sortAria: "Sort",
    sortByCode: "Sector code",
    sortByTicker: "By ticker",
    sortDefault: "Default",
    sortByReturn: "By return",
    sortByReturnTitle: "Highest return for the selected period first",
    noData: "No data",
    review: "Review",
    reviewTitle: "Under review: representative ETF selection may vary",
    goldenTitle: "Golden cross (SMA25 > SMA75 · uptrend)",
    deadTitle: "Dead cross (SMA25 < SMA75 · downtrend)",
    crossedDaysAgo: (n) => ` · crossed ${n} trading day(s) ago`,
    rsiOverbought: " · overbought",
    rsiOversold: " · oversold",
    rsiNeutral: " · neutral",
    bearMarket: "Bear market",
    bearMarketTitle: (dd) =>
      `${dd.toFixed(2)}% from 52-week high (a drop of 20% or more = bear market)`,
    correction: "Market correction",
    correctionTitle: (dd) =>
      `${dd.toFixed(2)}% from 52-week high (a drop of 10% or more = market correction)`,
    heroUs: "U.S. Equity Markets",
    heroGlobal: "Global Equities",
    heroJp: "TSE 33 Sectors",
    heroTopix17: "TOPIX-17 (17 Sectors)",
    majorIndices: "Major Indices",
    heroDow: "Dow Jones 30",
    disclaimer: "For informational purposes only; not investment advice.",
    jpAttribution:
      "TOPIX and related index values/trademarks are the intellectual property of JPX Market Innovation & Research, Inc. or its affiliates.",
    jpLagNote:
      "J-Quants updates on the next business day, so the latest value reflects the prior trading day (1-day lag).",
    topixAttribution:
      "TOPIX-17 and related index values/trademarks are the intellectual property of JPX Market Innovation & Research, Inc. or its affiliates. ETFs are the NEXT FUNDS series (Nomura Asset Management).",
    topixSourceNote:
      "Each sector is based on the price of its corresponding listed ETF (NEXT FUNDS). As price returns exclude dividends, they differ from the total-return TOPIX-17 sub-indices.",
    dowAttribution:
      "“Dow Jones Industrial Average” and related trademarks are the intellectual property of S&P Dow Jones Indices LLC. This page is based on the individual share prices of the 30 constituents, not the index itself.",
    dowSourceNote:
      "Constituents are updated manually (changes occur a few times a year). Prices via yfinance; total return (1Y) is an approximation derived from adjusted close (Adj Close).",
    updatedAt: "Updated",
    source: "Source",
    homeAria: "Market Performance home",
    rot: {
      heading: "Sector Rotation (Stock Clock)",
      subtitle:
        "Each sector is placed into four quadrants by the sign of its long-term (1Y) and short-term (1M) return, mapped to the stock-clock cycle: morning → midday → evening → night.",
      sourceNote:
        "The “Stock Clock” concept is proposed by Kentaro Shida (Yamawa Securities). This chart is a quantitative approximation based on price returns and may differ from the original earnings-outlook placement; the cycle does not necessarily rotate at a regular pace.",
      cycleNote: "Cycle: 🌅 Morning → ☀️ Midday → 🌆 Evening → 🌙 Night",
      longAxis: "Long-term trend (1Y)",
      shortAxis: "Short-term momentum (1M)",
      count: (n) => `${n} sector${n === 1 ? "" : "s"}`,
      empty: "None",
      excluded: (n) => `${n} sector${n === 1 ? "" : "s"} hidden (insufficient data)`,
      subtitleStocks:
        "Each stock is placed into four quadrants by the sign of its long-term (1Y) and short-term (1M) return, mapped to the stock-clock cycle: morning → midday → evening → night.",
      countStocks: (n) => `${n} stock${n === 1 ? "" : "s"}`,
      excludedStocks: (n) =>
        `${n} stock${n === 1 ? "" : "s"} hidden (insufficient data)`,
      phases: {
        morning: {
          name: "🌅 Morning — Dawn (bottoming rebound)",
          axis: "1Y − / 1M +",
          desc: "Signs of an earnings turnaround; a contrarian entry as the bottom forms.",
        },
        noon: {
          name: "☀️ Midday — Peak (leading uptrend)",
          axis: "1Y + / 1M +",
          desc: "Strong earnings lead the market; the core trend-following play.",
        },
        evening: {
          name: "🌆 Evening (topping / pullback)",
          axis: "1Y + / 1M −",
          desc: "Earnings still solid but the price is correcting; profit-taking dominates.",
        },
        night: {
          name: "🌙 Night — Before dawn (bottoming out)",
          axis: "1Y − / 1M −",
          desc: "A genuine reversal is still some way off; weakness tends to persist.",
        },
      },
    },
    portal: {
      sub: "Markets Data Lab",
      intro: "Market performance and sentiment, visualized simply.",
      dashTitle: "Market Performance Dashboard",
      dashDesc:
        "Period returns for U.S., global (by region) and TSE 33 sectors — heatmaps and a sector-rotation clock.",
      jfgiTitle: "Japan Fear & Greed Index",
      jfgiDesc:
        "Investor sentiment (fear vs. greed) for the Japanese market in a single index.",
      visit: "Open →",
      funHeading: "Just for fun (side projects)",
      funNote:
        "Personal hobby projects, separate from what markets-lab is about.",
      namaeTitle: "Namae Lab",
      namaeDesc:
        "An app to help you and your partner confidently decide on your baby's name.",
      devilTitle: "Devil Fruit Maker",
      devilDesc: "Discover your very own Devil Fruit, revealed from your name.",
      mansionTitle: "Mansion Poem Maker",
      mansionDesc:
        "Enter a station name and it generates a fictional Japanese condo “mansion poem” steeped in that neighborhood's atmosphere.",
    },
  },
};

// ---- 銘柄ラベル（ticker → 英名）: 米国 + 世界 ----
const EQUITY_EN: Record<string, string> = {
  // §2.1 主要米国株価指数
  DIA: "Dow Jones Industrial Average",
  SPY: "S&P 500",
  QQQ: "Nasdaq 100",
  IJH: "Core S&P Mid-Cap",
  IJR: "Core S&P Small-Cap",
  IWB: "Russell 1000",
  IWM: "Russell 2000",
  IWV: "Russell 3000",
  IVW: "S&P 500 Growth",
  IJK: "S&P MidCap 400 Growth",
  IJT: "S&P SmallCap 600 Growth",
  IVE: "S&P 500 Value",
  IJJ: "S&P MidCap 400 Value",
  IJS: "S&P SmallCap 600 Value",
  SCHD: "Dow Jones U.S. Dividend 100",
  RSP: "S&P 500 Equal Weight",
  MTUM: "MSCI USA Momentum Factor",
  USMV: "MSCI USA Min Volatility Factor",
  // §2.2 S&P500 セクター
  XLY: "Consumer Discretionary",
  XLP: "Consumer Staples",
  XLE: "Energy",
  XLF: "Financials",
  XLV: "Health Care",
  XLI: "Industrials",
  XLB: "Materials",
  XLK: "Technology",
  XLC: "Communication Services",
  XLU: "Utilities",
  XLRE: "Real Estate",
  // §2.4 コモディティ
  DBC: "Broad Commodities",
  DBE: "Energy",
  UNG: "Natural Gas",
  GLD: "Gold",
  SLV: "Silver",
  DBB: "Base Metals",
  DBA: "Agriculture",
  // §2.5 債券
  SHY: "Short-Term Treasury (1–3Y)",
  IEF: "Intermediate Treasury (7–10Y)",
  TLT: "Long-Term Treasury (20+Y)",
  AGG: "U.S. Aggregate Bond",
  TIP: "TIPS",
  HYG: "High Yield Bond",
  // §2.6 その他
  MAGS: "Magnificent Seven",
  SOXX: "Semiconductors",
  DRAM: "Memory Chips",
  GDX: "Gold Miners",
  SIL: "Silver Miners",
  // ---- 世界 Global ----
  // オールカントリー
  VT: "All-World",
  // 先進国
  VEA: "Developed ex-US",
  VTI: "United States",
  EWC: "Canada",
  VGK: "Europe",
  EWU: "United Kingdom",
  EWG: "Germany",
  EWQ: "France",
  EWI: "Italy",
  EWP: "Spain",
  EWL: "Switzerland",
  EWN: "Netherlands",
  EWK: "Belgium",
  ENOR: "Norway",
  EWD: "Sweden",
  EFNL: "Finland",
  EDEN: "Denmark",
  EWO: "Austria",
  EIRL: "Ireland",
  EIS: "Israel",
  EWJ: "Japan",
  EWH: "Hong Kong",
  EWS: "Singapore",
  EWA: "Australia",
  ENZL: "New Zealand",
  // 新興国
  VWO: "Emerging Markets",
  EEM: "Emerging Markets",
  EWW: "Mexico",
  ILF: "Latin America",
  EWZ: "Brazil",
  ARGT: "Argentina",
  ECH: "Chile",
  EPU: "Peru",
  EPOL: "Poland",
  TUR: "Turkey",
  UAE: "United Arab Emirates",
  QAT: "Qatar",
  KWT: "Kuwait",
  AFK: "Africa",
  EZA: "South Africa",
  EEMA: "Emerging Asia",
  EWY: "South Korea",
  EWT: "Taiwan",
  MCHI: "China",
  FXI: "China (Large-Cap)",
  THD: "Thailand",
  EWM: "Malaysia",
  VNM: "Vietnam",
  EPHE: "Philippines",
  EIDO: "Indonesia",
  INDA: "India",
};

// ---- 東証33業種（index_code → 英名, JPX 公式）----
const SECTOR_EN: Record<string, string> = {
  "0040": "Fishery, Agriculture & Forestry",
  "0041": "Mining",
  "0042": "Construction",
  "0043": "Foods",
  "0044": "Textiles & Apparels",
  "0045": "Pulp & Paper",
  "0046": "Chemicals",
  "0047": "Pharmaceutical",
  "0048": "Oil & Coal Products",
  "0049": "Rubber Products",
  "004A": "Glass & Ceramics Products",
  "004B": "Iron & Steel",
  "004C": "Nonferrous Metals",
  "004D": "Metal Products",
  "004E": "Machinery",
  "004F": "Electric Appliances",
  "0050": "Transportation Equipment",
  "0051": "Precision Instruments",
  "0052": "Other Products",
  "0053": "Electric Power & Gas",
  "0054": "Land Transportation",
  "0055": "Marine Transportation",
  "0056": "Air Transportation",
  "0057": "Warehousing & Harbor Transportation Services",
  "0058": "Information & Communication",
  "0059": "Wholesale Trade",
  "005A": "Retail Trade",
  "005B": "Banks",
  "005C": "Securities & Commodity Futures",
  "005D": "Insurance",
  "005E": "Other Financing Business",
  "005F": "Real Estate",
  "0060": "Services",
};

// ---- TOPIX-17（ETF 4桁コード → 英名, JPX 公式 TOPIX-17 セクター名）----
const TOPIX17_EN: Record<string, string> = {
  "1617": "Foods",
  "1618": "Energy Resources",
  "1619": "Construction & Materials",
  "1620": "Raw Materials & Chemicals",
  "1621": "Pharmaceutical",
  "1622": "Automobiles & Transportation Equipment",
  "1623": "Steel & Nonferrous Metals",
  "1624": "Machinery",
  "1625": "Electric Appliances & Precision Instruments",
  "1626": "IT & Services, Others",
  "1627": "Electric Power & Gas",
  "1628": "Transportation & Logistics",
  "1629": "Commercial & Wholesale Trade",
  "1630": "Retail Trade",
  "1631": "Banks",
  "1632": "Financials (ex Banks)",
  "1633": "Real Estate",
};

// ---- ダウ工業株30種（ticker → 英語社名）----
const DOW30_EN: Record<string, string> = {
  AAPL: "Apple",
  AMGN: "Amgen",
  AMZN: "Amazon",
  AXP: "American Express",
  BA: "Boeing",
  CAT: "Caterpillar",
  CRM: "Salesforce",
  CSCO: "Cisco Systems",
  CVX: "Chevron",
  DIS: "Walt Disney",
  GOOGL: "Alphabet (Class A)",
  GS: "Goldman Sachs",
  HD: "Home Depot",
  HON: "Honeywell",
  IBM: "IBM",
  JNJ: "Johnson & Johnson",
  JPM: "JPMorgan Chase",
  KO: "Coca-Cola",
  MCD: "McDonald's",
  MMM: "3M",
  MRK: "Merck",
  MSFT: "Microsoft",
  NKE: "Nike",
  NVDA: "NVIDIA",
  PG: "Procter & Gamble",
  SHW: "Sherwin-Williams",
  TRV: "Travelers",
  UNH: "UnitedHealth",
  V: "Visa",
  WMT: "Walmart",
};

// ---- ブロック/ティア/地域タイトル（英名）----
const BLOCK_EN: Record<string, string> = {
  us_index: "U.S. Equity Index ETFs",
  sectors: "S&P 500 Sector ETFs",
  commodities: "Commodity ETFs",
  bonds: "Bond ETFs",
  others: "Other ETFs",
  jp_sectors_33: "TSE 33 Sectors",
  topix17: "TOPIX-17",
  dow30: "Dow Jones 30",
};

const TIER_EN: Record<string, string> = {
  allcountry: "All-Country ETFs",
  developed: "Developed Markets ETFs",
  emerging: "Emerging Markets ETFs",
};

// 地域ラベルは data.region_labels が英名。日本語表示用の対応表。
const REGION_JA: Record<string, string> = {
  americas: "南北アメリカ",
  europe: "ヨーロッパ",
  mea: "中東・アフリカ",
  apac: "アジア太平洋",
};

// ---- ルックアップ・ヘルパー ----
export function equityLabel(lang: Lang, ticker: string, jaLabel: string): string {
  if (lang === "en") return EQUITY_EN[ticker] ?? jaLabel;
  return jaLabel;
}

export function sectorLabel(
  lang: Lang,
  indexCode: string,
  jaLabel: string
): string {
  if (lang === "en") return SECTOR_EN[indexCode] ?? jaLabel;
  return jaLabel;
}

export function blockTitle(lang: Lang, id: string, jaTitle: string): string {
  if (lang === "en") return BLOCK_EN[id] ?? jaTitle;
  return jaTitle;
}

// TOPIX-17: ETF 4桁コード → 表示名（en は JPX 公式セクター名）。
export function topixLabel(lang: Lang, code: string, jaLabel: string): string {
  if (lang === "en") return TOPIX17_EN[code] ?? jaLabel;
  return jaLabel;
}

// ダウ工業株30種: ticker → 表示名（en は英語社名）。
export function dowLabel(lang: Lang, ticker: string, jaLabel: string): string {
  if (lang === "en") return DOW30_EN[ticker] ?? jaLabel;
  return jaLabel;
}

// JPX「東証マネー部！」の銘柄ページ URL（各業種名リンク先・4桁コード差し込み）。
export function moneyBuUrl(code: string): string {
  return `https://money-bu-jpx.com/search/${encodeURIComponent(code)}/`;
}

export function tierTitle(lang: Lang, id: string, jaTitle: string): string {
  if (lang === "en") return TIER_EN[id] ?? jaTitle;
  return jaTitle;
}

// group.label は data 上では英名。ja のときだけ和名に差し替える。
export function regionLabel(
  lang: Lang,
  region: string,
  dataLabel: string
): string {
  if (lang === "ja") return REGION_JA[region] ?? dataLabel;
  return dataLabel;
}

// ---- 日付/日時フォーマット ----
export function fmtDate(lang: Lang, iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (lang === "en") {
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function fmtDateTime(lang: Lang, iso: string): string {
  return new Date(iso).toLocaleString(lang === "en" ? "en-US" : "ja-JP");
}
