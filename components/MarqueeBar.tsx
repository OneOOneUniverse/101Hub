"use client";

type MarqueeBarProps = {
  text: string;
  bgColor?: string;
  textColor?: string;
};

export default function MarqueeBar({
  text,
  bgColor = "#000",
  textColor = "#fff",
}: MarqueeBarProps) {
  if (!text) return null;

  return (
    <>
      <div
        className="marquee-bar"
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        <div className="marquee-track">
          <span className="marquee-content">{text}</span>
          <span className="marquee-content" aria-hidden="true">{text}</span>
        </div>
      </div>
      <style jsx global>{`
        .marquee-bar {
          width: 100%;
          overflow: hidden;
          white-space: nowrap;
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          padding: 6px 0;
          position: relative;
          z-index: 21;
        }
        .marquee-track {
          display: inline-flex;
          animation: marquee-scroll 30s linear infinite;
        }
        .marquee-content {
          display: inline-block;
          padding: 0 3rem;
        }
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </>
  );
}
