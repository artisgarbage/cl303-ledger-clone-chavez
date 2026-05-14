import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://margot.so";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" as const },
    { path: "/product", priority: 0.9, changeFrequency: "monthly" as const },
    { path: "/modes", priority: 0.9, changeFrequency: "monthly" as const },
    { path: "/pricing", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/agents", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/security", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/about", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/customers", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/blog", priority: 0.8, changeFrequency: "weekly" as const },
    {
      path: "/blog/why-our-cfo-has-a-name",
      priority: 0.7,
      changeFrequency: "yearly" as const,
    },
    {
      path: "/blog/building-a-tool-for-other-ais",
      priority: 0.7,
      changeFrequency: "yearly" as const,
    },
  ];

  return routes.map((r) => ({
    url: `${BASE_URL}${r.path}`,
    lastModified: new Date(),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
