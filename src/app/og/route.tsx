import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") ?? "Margot";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "space-between",
        backgroundColor: "#fafaf9",
        padding: "60px 72px",
        fontFamily: "serif",
      }}
    >
      {/* Top wordmark */}
      <div
        style={{
          fontSize: 28,
          fontWeight: 600,
          color: "#1c1917",
          letterSpacing: "-0.5px",
        }}
      >
        Margot
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: title.length > 40 ? 44 : 56,
          fontWeight: 300,
          color: "#1c1917",
          lineHeight: 1.15,
          maxWidth: "840px",
        }}
      >
        {title}
      </div>

      {/* Bottom strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 32,
            height: 3,
            backgroundColor: "oklch(0.42 0.13 25)",
            borderRadius: 2,
          }}
        />
        <div
          style={{
            fontSize: 16,
            color: "#78716c",
          }}
        >
          Fractional CFO for creative and dev agencies
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    },
  );
}
