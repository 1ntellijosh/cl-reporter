import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const coreSrc = path.join(root, "packages/src/index.ts");
/**
 * When packing from local terminal, '@reporter/core' resolves to the .packages/core/src/index.ts file.
 * When packing from Skaffold/Docker/production, '@reporter/core' has ./packages/core/dist folder, and the alias is
 * resolved via node_modules.
 */
const packingFromLocalDirectory = existsSync(coreSrc);

const nextConfig = {
  output: "standalone", // for production Docker (single deployable .next/standalone)
  transpilePackages: ["@reporter/core"],
  // Dev: allow HMR when the app is opened via a host like reporter.com (Ingress / /etc/hosts); see Next.js "Blocked cross-origin request" warning.
  allowedDevOrigins: ["reporter.com"],
  webpack: (config) => {
    if (packingFromLocalDirectory) {
      config.resolve.alias ??= {};
      config.resolve.alias["@reporter/core"] = coreSrc;
    }
    return config;
  },
  turbopack: {
    resolveAlias: {
      underscore: "lodash",
      ...(packingFromLocalDirectory && { "@reporter/core": coreSrc }),
    },
  },
  experimental: {
    turbopackFileSystemCacheForDev: true
  },
};

export default nextConfig;