import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// This factory must return Lovable's wrapper options, not raw Vite plugins.
const pages = process.env.TANGO_PAGES === "true";
export default defineConfig({
  nitro: pages ? false : undefined,
  vite: { base: pages ? "/TangoMaker/" : "/" },
  tanstackStart: {
    server: { entry: "server" },
    ...(pages
      ? {
          router: { basepath: "/TangoMaker" },
          prerender: {
            enabled: true,
            autoStaticPathsDiscovery: false,
            crawlLinks: false,
            failOnError: true,
          },
          pages: [{ path: "/tango" }],
        }
      : {}),
  },
});
