import { renderOG, ogSize, ogContentType } from "@/lib/og";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "Global Equities — markets-lab";

export default function Image() {
  return renderOG({
    title: "Global Equities",
    subtitle: "Developed & Emerging Markets by region",
  });
}
