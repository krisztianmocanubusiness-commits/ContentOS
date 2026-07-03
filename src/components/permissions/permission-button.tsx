"use client";

import * as React from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePermission } from "@/hooks/use-permission";
import { PERMISSION_LABELS, type Permission } from "@/lib/permissions";
import type { VariantProps } from "class-variance-authority";

type PermissionButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    permission: Permission;
    asChild?: boolean;
  };

export function PermissionButton({
  permission,
  children,
  ...props
}: PermissionButtonProps) {
  const allowed = usePermission(permission);

  if (allowed) {
    return <Button {...props}>{children}</Button>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="inline-flex">
          <Button {...props} disabled>
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        Your role can&apos;t {PERMISSION_LABELS[permission].toLowerCase()}.
      </TooltipContent>
    </Tooltip>
  );
}
