import type { MetadataRoute } from "next";

// GSC はドメイン型プロパティ（markets-lab.com）で登録済みのため、
// 配下サブドメイン横断で URL を列挙できる。
// このサイトマップは dashboard.markets-lab.com/sitemap.xml で配信される。
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    // apex ランディング（ハブ）
    {
      url: "https://markets-lab.com/",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    // 市場パフォーマンス・ダッシュボード（日次更新）
    {
      url: "https://dashboard.markets-lab.com/",
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: "https://dashboard.markets-lab.com/global",
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: "https://dashboard.markets-lab.com/jp-sectors",
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: "https://dashboard.markets-lab.com/topix17",
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: "https://dashboard.markets-lab.com/dow30",
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    // 日本版 Fear & Greed 指数（別サイト・日次更新）
    {
      url: "https://jfgi.markets-lab.com/",
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];
}
