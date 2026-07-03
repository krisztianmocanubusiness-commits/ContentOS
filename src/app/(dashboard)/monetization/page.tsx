"use client";

import { ArrowDownRight, ArrowUpRight, Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { PermissionButton } from "@/components/permissions/permission-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { monetizationForWorkspace } from "@/lib/mock-data";
import { dealStatusVariant } from "@/lib/status";
import { useWorkspace } from "@/context/workspace-context";

export default function MonetizationPage() {
  const { activeWorkspace } = useWorkspace();
  const { summary, deals } = monetizationForWorkspace(activeWorkspace.id);

  return (
    <div>
      <PageHeader
        title="Monetization"
        description={`Brand deals and revenue for ${activeWorkspace.name}.`}
        action={
          <PermissionButton permission="manageMonetization">
            <Plus />
            New deal
          </PermissionButton>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold">
                {stat.value}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <span
                className={
                  "inline-flex items-center gap-1 text-xs font-medium " +
                  (stat.trend === "up" ? "text-success" : "text-destructive")
                }
              >
                {stat.trend === "up" ? (
                  <ArrowUpRight className="size-3.5" />
                ) : (
                  <ArrowDownRight className="size-3.5" />
                )}
                {stat.change}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6 overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brand</TableHead>
              <TableHead>Deal</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deals.map((deal) => (
              <TableRow key={deal.id}>
                <TableCell className="font-medium">{deal.brand}</TableCell>
                <TableCell className="text-muted-foreground">
                  {deal.title}
                </TableCell>
                <TableCell>{deal.value}</TableCell>
                <TableCell>
                  <Badge variant={dealStatusVariant(deal.status)}>
                    {deal.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {deal.dueDate}
                </TableCell>
              </TableRow>
            ))}
            {deals.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-muted-foreground"
                >
                  No deals yet in {activeWorkspace.name}.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
