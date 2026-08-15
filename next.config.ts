import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /*
   * Fully static. There is no server-side logic anywhere in this app — profiles
   * travel in the URL fragment — so exporting to plain HTML/CSS/JS keeps it
   * hostable on Vercel, GitHub Pages, Netlify, S3 or a USB stick.
   */
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
