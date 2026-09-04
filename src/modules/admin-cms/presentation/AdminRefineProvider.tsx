"use client";

import { Refine } from "@refinedev/core";
import type { ReactNode } from "react";
import { ADMIN_RESOURCES } from "../domain/resources.ts";

export function AdminRefineProvider({ children }: { children: ReactNode }) {
  return (
    <Refine
      resources={ADMIN_RESOURCES.map((resource) => ({
        name: resource.key,
        list: resource.href,
        meta: { label: resource.label },
      }))}
      options={{ disableTelemetry: true }}
    >
      {children}
    </Refine>
  );
}
