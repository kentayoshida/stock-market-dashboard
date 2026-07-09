import { renderOG, ogSize, ogContentType } from "@/lib/og";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "Market Performance Dashboard — markets-lab";

export default function Image() {
  return renderOG({
    title: "Market Performance",
    subtitle: "U.S. · Global · TSE 33 Sectors",
  });
}
