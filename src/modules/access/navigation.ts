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
  const clientPathMatch = currentPath.match(/^\/c\/([^/]+)\//);
  const currentClientSlug = clientPathMatch?.[1] ?? null;
  const visibleClients = currentClientSlug
    ? clients.filter((client) => client.clientSlug === currentClientSlug)
    : clients;

  const clientSection: NavigationSection = {
    title: currentClientSlug ? "Сайты проекта" : "Проекты",
    items: visibleClients.map((client) => ({
      href: `/c/${client.clientSlug}/`,
      label: client.name,
      active:
        currentPath === `/c/${client.clientSlug}/` ||
        currentPath.startsWith(`/c/${client.clientSlug}/`),
      children: client.sites.map((site) => ({
        href: `/c/${client.clientSlug}/${site.siteSlug}/`,
        label: site.name,
        active: currentPath === `/c/${client.clientSlug}/${site.siteSlug}/`,
        muted: !site.enabled,
      })),
    })),
  };

  if (currentClientSlug) {
    return [
      {
        title: "Обзор",
        items: [
          {
            href: "/analyst/",
            label: "Общий кабинет",
            active: false,
          },
          {
            href: "/analyst/projects/",
            label: "Проекты",
            active: false,
          },
        ],
      },
      clientSection,
    ];
  }

  const overviewItems: NavigationItem[] = [
    {
      href: "/analyst/",
      label: "Общий кабинет",
      active: currentPath === "/analyst/",
    },
    {
      href: "/analyst/projects/",
      label: "Проекты",
      active: currentPath.startsWith("/analyst/projects/"),
    },
  ];

  if (currentPath === "/" || currentPath === "/demo/") {
    overviewItems.unshift({
      href: "/",
      label: "Старт",
      active: currentPath === "/",
    });
    overviewItems.push({
      href: "/demo/",
      label: "Демо",
      active: currentPath === "/demo/",
    });
  }

  return [
    {
      title: "Обзор",
      items: overviewItems,
    },
    clientSection,
  ];
}
