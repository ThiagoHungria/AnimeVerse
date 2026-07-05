import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // MyAnimeList artwork (via Jikan)
      { protocol: "https", hostname: "cdn.myanimelist.net" },
      // YouTube trailer thumbnails (used as wide banners)
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      // Local fallback dataset placeholders
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
    ],
  },
};

export default nextConfig;
