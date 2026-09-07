"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import * as React from "react";
import { cn } from "../../shared/lib/cn.ts";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export function TooltipContent({ className, sideOffset = 6, ...props }: React.ComponentProps<typeof TooltipPrimitive.Popup> & { sideOffset?: number }) { return <TooltipPrimitive.Portal><TooltipPrimitive.Positioner sideOffset={sideOffset}><TooltipPrimitive.Popup data-slot="tooltip-content" className={cn("z-50 rounded-lg bg-slate-950 px-3 py-1.5 text-xs text-white shadow-md transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0", className)} {...props} /></TooltipPrimitive.Positioner></TooltipPrimitive.Portal>; }
