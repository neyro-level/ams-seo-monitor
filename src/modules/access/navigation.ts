import "server-only";

import { ProjectService } from "../../application/services/project-service";
import { PrismaProjectRepository } from "../../infrastructure/database/repositories/prisma-project-repository";
import type { AuthenticatedUser } from "../../infrastructure/auth/types";

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

const projectRepository = new PrismaProjectRepository();
const projectService = new ProjectService(projectRepository);

export async function buildNavigation(
  currentPath: string,
  user: AuthenticatedUser,
): Promise<NavigationSection[]> {
  const projectSummaries = await projectService.listProjectsForUser(user);
  const clientPathMatch = currentPath.match(/^\/c\/([^/]+)\//);
  const currentClientSlug = clientPathMatch?.[1] ?? null;
  const visibleProjects = currentClientSlug
    ? projectSummaries.filter((project) => project.projectSlug === currentClientSlug)
    : projectSummaries;

  const items: NavigationItem[] = [];
  for (const projectSummary of visibleProjects) {
    const project = await projectRepository.findProjectBySlug(projectSummary.projectSlug);
    if (!project) {
      continue;
    }

    items.push({
      href: `/c/${project.projectSlug}/`,
      label: `Проект ${project.name}`,
      active: currentPath === `/c/${project.projectSlug}/` || currentPath.startsWith(`/c/${project.projectSlug}/`),
      children: project.sites.map((site) => ({
        href: `/c/${project.projectSlug}/${site.siteSlug}/`,
        label: site.name,
        active: currentPath === `/c/${project.projectSlug}/${site.siteSlug}/`,
        muted: !site.enabled,
      })),
    });
  }

  const rootHref = user.systemRole === "SEO_ANALYST" ? "/analyst/" : "/";
  const rootLabel = user.systemRole === "SEO_ANALYST" ? "Все проекты" : "Мои проекты";

  return [
    {
      title: "",
      items: [
        {
          href: rootHref,
          label: rootLabel,
          active: currentPath === rootHref,
        },
      ],
    },
    {
      title: "Проекты",
      items,
    },
  ];
}
