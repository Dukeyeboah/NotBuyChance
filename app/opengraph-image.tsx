import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "NotBuyChance — The perfect gift isn't by chance.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const [logo, fraunces, geist] = await Promise.all([
    readFile(join(process.cwd(), "public/logo.png")),
    readFile(join(process.cwd(), "lib/fonts/Fraunces-600.ttf")),
    readFile(join(process.cwd(), "lib/fonts/Geist-500.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#fff8f4",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -140,
            left: -90,
            width: 460,
            height: 460,
            borderRadius: 999,
            background: "rgba(79, 70, 229, 0.16)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -110,
            right: -70,
            width: 420,
            height: 420,
            borderRadius: 999,
            background: "rgba(244, 63, 94, 0.15)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -160,
            right: 220,
            width: 340,
            height: 340,
            borderRadius: 999,
            background: "rgba(249, 115, 22, 0.16)",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            height: "100%",
            padding: "56px 72px 70px",
          }}
        >
          <img
            src={`data:image/png;base64,${logo.toString("base64")}`}
            width={340}
            height={359}
            alt=""
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginLeft: 28,
              maxWidth: 680,
            }}
          >
            <div
              style={{
                fontFamily: "Geist",
                fontSize: 22,
                letterSpacing: 2.4,
                color: "#4338ca",
              }}
            >
              PERSONAL TASTE DISCOVERY
            </div>
            <div
              style={{
                fontFamily: "Fraunces",
                fontSize: 78,
                lineHeight: 1,
                color: "#1f2937",
                marginTop: 18,
              }}
            >
              NotBuyChance
            </div>
            <div
              style={{
                fontFamily: "Fraunces",
                fontSize: 40,
                lineHeight: 1.15,
                color: "#1f2937",
                marginTop: 20,
              }}
            >
              The perfect gift isn&apos;t by chance.
            </div>
            <div
              style={{
                fontFamily: "Geist",
                fontSize: 26,
                lineHeight: 1.35,
                color: "#6b7280",
                marginTop: 22,
              }}
            >
              Thoughtful gifts, experiences, and unexpected discoveries.
            </div>
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 14,
            background: "linear-gradient(90deg, #4f46e5, #a855f7, #f43f5e, #f97316)",
          }}
        />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Fraunces", data: fraunces, weight: 600, style: "normal" },
        { name: "Geist", data: geist, weight: 500, style: "normal" },
      ],
    },
  );
}
