import { getClients } from "../client-registry/registry";

export type NavigationChild = {
  href: string;
  label: string;
  active: boolean;
  muted?: boolean;
};

export type NavigationItem = {
  href: string;
  label: string;
  active: boolean;
  children?: NavigationChild[];
};

export type NavigationSection = {
  title: string;
  items: NavigationItem[];
};

export function buildNavigation(currentPath: string): NavigationSection[] {
  const clients = getClients();

  return [
    {
      title: "Обзор",
      items: [
        {
          href: "/",
          label: "Старт",
          active: currentPath === "/",
        },
        {
          href: "/demo/",
          label: "Демо",
          active: currentPath === "/demo/",
        },
        {
          href: "/analyst/",
          label: "Аналитик",
          active: currentPath === "/analyst/",
        },
      ],
    },
    {
      title: "Клиенты",
      items: clients.map((client) => ({
        href: `/c/${client.clientSlug}/`,
        label: client.name,
        active: currentPath === `/c/${client.clientSlug}/` || currentPath.startsWith(`/c/${client.clientSlug}/`),
        children: client.sites.map((site) => ({
          href: `/c/${client.clientSlug}/${site.siteSlug}/`,
          label: site.name,
          active: currentPath === `/c/${client.clientSlug}/${site.siteSlug}/`,
          muted: !site.enabled,
        })),
      })),
    },
  ];
}
