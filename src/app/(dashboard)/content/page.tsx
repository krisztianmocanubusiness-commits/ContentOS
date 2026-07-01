"use client";

import { Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { contentForWorkspace, type ContentStatus } from "@/lib/mock-data";
import { statusVariant } from "@/lib/status";
import { useWorkspace } from "@/context/workspace-context";

const filters: { label: string; status: ContentStatus | "All" }[] = [
  { label: "All", status: "All" },
  { label: "Drafts", status: "Draft" },
  { label: "Scheduled", status: "Scheduled" },
  { label: "Needs Review", status: "Needs Review" },
  { label: "Published", status: "Published" },
];

export default function ContentPage() {
  const { activeWorkspace } = useWorkspace();
  const contentItems = contentForWorkspace(activeWorkspace.id);

  return (
    <div>
      <PageHeader
        title="Content"
        description={`Every piece of content in ${activeWorkspace.name}'s pipeline.`}
        action={
          <Button>
            <Plus />
            New content
          </Button>
        }
      />

      <Tabs defaultValue="All" key={activeWorkspace.id}>
        <TabsList className="mb-4">
          {filters.map((filter) => (
            <TabsTrigger key={filter.status} value={filter.status}>
              {filter.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {filters.map((filter) => {
          const rows =
            filter.status === "All"
              ? contentItems
              : contentItems.filter((item) => item.status === filter.status);

          return (
            <TabsContent key={filter.status} value={filter.status}>
              <Card className="overflow-hidden py-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="max-w-xs truncate font-medium">
                          {item.title}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.platform}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(item.status)}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.author}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.date}
                        </TableCell>
                      </TableRow>
                    ))}
                    {rows.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-10 text-center text-muted-foreground"
                        >
                          {contentItems.length === 0
                            ? `No content yet in ${activeWorkspace.name}.`
                            : "No content in this view yet."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
