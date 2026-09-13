import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/passion";

const nextConfig: NextConfig = {
  basePath,
  serverExternalPackages: ["word-extractor", "pdf-parse", "mammoth"],
};

export default nextConfig;
