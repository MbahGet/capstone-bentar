import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output: Next.js bundlés hanya file yang dibutuhkan runtime.
  // Menghasilkan .next/standalone/server.js — ideal untuk Docker image kecil.
  output: "standalone",
};

export default nextConfig;
