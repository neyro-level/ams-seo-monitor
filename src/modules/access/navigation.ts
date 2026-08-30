import "server-only";

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

  const allProjectsSection: NavigationSection = {
    title: "",
    items: [
      {
        href: "/analyst/",
        label: "Все проекты",
        active: currentPath === "/analyst/",
      },
    ],
  };

  const projectsSection: NavigationSection = {
    title: "Проекты",
    items: visibleClients.map((client) => ({
      href: `/c/${client.clientSlug}/`,
      label: `Проект ${client.name}`,
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

  return [allProjectsSection, projectsSection];
}
