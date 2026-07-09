import { renderOG, ogSize, ogContentType } from "@/lib/og";

export const size = ogSize;
export const contentType = ogContentType;
export const alt = "TSE 33 Sectors — markets-lab";

export default function Image() {
  return renderOG({
    title: "TSE 33 Sectors",
    subtitle: "Japan sector performance & rotation clock",
  });
}
