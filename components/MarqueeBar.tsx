"use client";

type MarqueeBarProps = {
  text: string;
  bgColor?: string;
  textColor?: string;
  speed?: number;
};

export default function MarqueeBar({
  text,
  bgColor = "#000",
  textColor = "#fff",
  speed = 30,
}: MarqueeBarProps) {
  if (!text) return null;

  return (
    <div
      style={{
        width: "100%",
        overflow: "hidden",
        whiteSpace: "nowrap",
        fontSize: "0.8rem",
        fontWeight: 600,
        letterSpacing: "0.02em",
        padding: "6px 0",
        position: "relative",
        zIndex: 21,
        backgroundColor: bgColor,
        color: textColor,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          animation: `marquee-scroll ${speed}s linear infinite`,
        }}
      >
        <span style={{ display: "inline-block", padding: "0 3rem" }}>{text}</span>
        <span style={{ display: "inline-block", padding: "0 3rem" }} aria-hidden="true">{text}</span>
        <span style={{ display: "inline-block", padding: "0 3rem" }} aria-hidden="true">{text}</span>
        <span style={{ display: "inline-block", padding: "0 3rem" }} aria-hidden="true">{text}</span>
      </div>
    </div>
  );
}
