import type { MetadataRoute } from "next";

/**
 * Everything past /login and /signup is per-tenant workspace data behind
 * auth — there's nothing here a search engine should ever index, and
 * crawling it wastes crawl budget on pages that just redirect to /login
 * anyway (see src/proxy.ts). Only the two public auth pages are allowed.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/login", "/signup"],
      disallow: "/",
    },
  };
}
