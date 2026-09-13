import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["word-extractor", "pdf-parse", "mammoth"],
};

export default nextConfig;
