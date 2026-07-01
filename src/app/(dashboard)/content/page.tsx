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
import { contentItems, type ContentStatus } from "@/lib/mock-data";
import { statusVariant } from "@/lib/status";

const filters: { label: string; status: ContentStatus | "All" }[] = [
  { label: "All", status: "All" },
  { label: "Drafts", status: "Draft" },
  { label: "Scheduled", status: "Scheduled" },
  { label: "Needs Review", status: "Needs Review" },
  { label: "Published", status: "Published" },
];

export default function ContentPage() {
  return (
    <div>
      <PageHeader
        title="Content"
        description="Every piece of content in your pipeline, in one place."
        action={
          <Button>
            <Plus />
            New content
          </Button>
        }
      />

      <Tabs defaultValue="All">
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
                          No content in this view yet.
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
