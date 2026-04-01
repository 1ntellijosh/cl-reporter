import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const cmnSrc = path.join(root, "packages/src/index.ts");
/**
 * When packing from local terminal, '@reporter/common' resolves to the .packages/common/src/index.ts file.
 * When packing from Skaffold/Docker/production, '@reporter/common' has ./packages/common/dist folder, and the alias is
 * resolved via node_modules.
 */
const packingFromLocalDirectory = existsSync(cmnSrc);
/** Turbopack requires a path relative to the client project, not an absolute filesystem path. */
const cmnSrcRelativeToClient = path.relative(__dirname, cmnSrc);

const nextConfig = {
  output: "standalone", // for production Docker (single deployable .next/standalone)
  transpilePackages: ["@reporter/common"],
  // Dev: allow HMR when the app is opened via a host like reporter.com (Ingress / /etc/hosts); see Next.js "Blocked cross-origin request" warning.
  allowedDevOrigins: ["reporter.com"],
  webpack: (config) => {
    if (packingFromLocalDirectory) {
      config.resolve.alias ??= {};
      config.resolve.alias["@reporter/common"] = cmnSrc;
    }
    return config;
  },
  turbopack: {
    resolveAlias: {
      underscore: "lodash",
      ...(packingFromLocalDirectory && { "@reporter/common": cmnSrcRelativeToClient }),
    },
  },
  experimental: {
    turbopackFileSystemCacheForDev: true
  },
};

export default nextConfig;