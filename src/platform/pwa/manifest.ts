export function getPwaManifest() {
  return {
    id: "/dashboard/",
    name: "АМС ИМПУЛЬС",
    short_name: "АМС",
    description: "Рабочая платформа АМС",
    start_url: "/dashboard/",
    scope: "/",
    display: "standalone" as const,
    orientation: "any" as const,
    background_color: "#eef2f5",
    theme_color: "#101720",
    lang: "ru",
    categories: ["business", "productivity"],
    icons: [
      { src: "/pwa-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" as const },
      { src: "/pwa-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" as const },
      { src: "/pwa-icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" as const },
      { src: "/pwa-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" as const },
    ],
  };
}
