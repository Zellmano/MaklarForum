import type { MetadataRoute } from "next";

const BASE_URL = "https://maklarforum.se";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/priser", "/villkor", "/integritet", "/disclaimer", "/register", "/login"].map(
    (path) => ({
      url: `${BASE_URL}${path}`,
      changeFrequency: "monthly",
      priority: path === "/" ? 1 : 0.6,
    }),
  );
}
