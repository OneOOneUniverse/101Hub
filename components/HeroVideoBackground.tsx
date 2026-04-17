"use client";

import { useCallback, useRef, useState } from "react";

interface HeroVideoBackgroundProps {
  /** Desktop video URLs (landscape). Falls back to /hero-video.mp4 */
  desktopVideos: string[];
  /** Mobile video URLs (portrait). Falls back to /Web Search Tab Intro.mp4 */
  mobileVideos: string[];
}

/** Apply Cloudinary optimizations if the URL is from Cloudinary */
function optimize(url: string, width: number): string {
  if (!url.includes("res.cloudinary.com")) return url;
  return url.replace("/upload/", `/upload/q_auto,f_auto,w_${width},br_2m/`);
}

export default function HeroVideoBackground({
  desktopVideos,
  mobileVideos,
}: HeroVideoBackgroundProps) {
  const dVids = desktopVideos.length > 0 ? desktopVideos : ["/hero-video.mp4"];
  const mVids = mobileVideos.length > 0 ? mobileVideos : ["/Web Search Tab Intro.mp4"];

  const [dIdx, setDIdx] = useState(0);
  const [mIdx, setMIdx] = useState(0);
  const dRef = useRef<HTMLVideoElement>(null);
  const mRef = useRef<HTMLVideoElement>(null);

  const handleDesktopEnded = useCallback(() => {
    const next = (dIdx + 1) % dVids.length;
    setDIdx(next);
  }, [dIdx, dVids.length]);

  const handleMobileEnded = useCallback(() => {
    const next = (mIdx + 1) % mVids.length;
    setMIdx(next);
  }, [mIdx, mVids.length]);

  return (
    <>
      {/* Desktop */}
      <video
        ref={dRef}
        key={`desktop-${dIdx}`}
        autoPlay
        muted
        playsInline
        preload="metadata"
        onEnded={handleDesktopEnded}
        className="absolute inset-0 h-full w-full object-cover hidden sm:block"
        src={optimize(dVids[dIdx], 1280)}
      />
      {/* Mobile */}
      <video
        ref={mRef}
        key={`mobile-${mIdx}`}
        autoPlay
        muted
        playsInline
        preload="metadata"
        onEnded={handleMobileEnded}
        className="absolute inset-0 h-full w-full object-cover sm:hidden"
        src={optimize(mVids[mIdx], 480)}
      />
    </>
  );
}
