import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile @theme-toggles/react since it ships raw .tsx source files
  transpilePackages: ["@theme-toggles/react"],
};

export default nextConfig;
