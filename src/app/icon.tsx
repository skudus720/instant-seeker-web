import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#FFD400",
        color: "#090909",
        fontSize: 25,
        fontWeight: 900,
        border: "5px solid #090909",
      }}
    >
      IS
    </div>,
    size,
  );
}
