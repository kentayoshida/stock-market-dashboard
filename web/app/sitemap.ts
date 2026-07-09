import type { MetadataRoute } from "next";

// GSC 対象は dashboard.markets-lab.com。公開3ページを絶対 URL で列挙。
const BASE = "https://dashboard.markets-lab.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: `${BASE}/global`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE}/jp-sectors`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];
}
