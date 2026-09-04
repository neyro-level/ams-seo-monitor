import {
  hasPermission,
  type ActorContext,
} from "../../identity-access/index.ts";
import { getProjectService } from "../../../infrastructure/service-container.ts";

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

export async function buildNavigation(
  currentPath: string,
  user: ActorContext,
): Promise<NavigationSection[]> {
  const projectTrees = await getProjectService().listProjectTreesForUser(user);
  const clientPathMatch = currentPath.match(/^\/c\/([^/]+)\//);
  const currentClientSlug = clientPathMatch?.[1] ?? null;
  const visibleProjects = currentClientSlug
    ? projectTrees.filter((project) => project.projectSlug === currentClientSlug)
    : projectTrees;

  const items: NavigationItem[] = visibleProjects.map((project) => ({
    href: `/c/${project.projectSlug}/`,
    label: `Проект ${project.name}`,
    active:
      currentPath === `/c/${project.projectSlug}/` ||
      currentPath.startsWith(`/c/${project.projectSlug}/`),
    children: project.sites.map((site) => ({
      href: `/c/${project.projectSlug}/${site.siteSlug}/`,
      label: site.name,
      active: currentPath === `/c/${project.projectSlug}/${site.siteSlug}/`,
      muted: !site.enabled,
    })),
  }));

  const hasGlobalProjectAccess = hasPermission(user, "project:read:any");
  const rootHref = hasGlobalProjectAccess ? "/analyst/" : "/dashboard/";
  const rootLabel = hasGlobalProjectAccess ? "Все проекты" : "Мои проекты";

  return [
    {
      title: "",
      items: [
        {
          href: rootHref,
          label: rootLabel,
          active: currentPath === rootHref,
        },
        ...(hasPermission(user, "platform:manage")
          ? [
              {
                href: "/admin/organizations/",
                label: "Администрирование",
                active: currentPath.startsWith("/admin/"),
              },
            ]
          : []),
      ],
    },
    {
      title: "Проекты",
      items,
    },
  ];
}
