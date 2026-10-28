export const seo = (title: string, description: string) => ({
  meta: [
    { title: `${title} · PLANNET CONTROL` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} · PLANNET CONTROL` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ],
});
