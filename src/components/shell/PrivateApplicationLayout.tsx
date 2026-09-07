import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentPrincipalState } from "../../modules/identity-access/server.ts";
import { buildNavigation } from "../../modules/project-registry/presentation.ts";
import { AppShell } from "./AppShell.tsx";

export async function PrivateApplicationLayout({ children }: { children: ReactNode }) {
  const state = await getCurrentPrincipalState();
  if (!state) redirect("/?login=1");
  const sections = await buildNavigation("/", state.principal);
  return <AppShell sections={sections} displayName={state.displayName}>{children}</AppShell>;
}
