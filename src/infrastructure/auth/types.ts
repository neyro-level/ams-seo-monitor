export interface AuthenticatedUser {
  userId: string;
  email: string;
  name: string;
  systemRole: "SEO_ANALYST" | "CLIENT_VIEWER";
  activeOrganizationId: string | null;
}

export interface AuthorizedProjectAccess {
  organizationId: string;
  projectId: string;
  projectSlug: string;
}

export interface AuthorizedSiteAccess {
  organizationId: string;
  projectId: string;
  siteId: string;
  projectSlug: string;
  siteSlug: string;
}
