import { FileText, Image as ImageIcon, Music, Upload, Video } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { assets, type Asset } from "@/lib/mock-data";

const typeIcon: Record<Asset["type"], React.ElementType> = {
  Image: ImageIcon,
  Video: Video,
  Audio: Music,
  Document: FileText,
};

export default function AssetsPage() {
  return (
    <div>
      <PageHeader
        title="Assets"
        description="Every image, video, and file your team uses in content."
        action={
          <Button>
            <Upload />
            Upload asset
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assets.map((asset) => {
          const Icon = typeIcon[asset.type];
          return (
            <Card key={asset.id} className="gap-0 overflow-hidden py-0">
              <div className="flex aspect-video items-center justify-center bg-muted">
                <Icon className="size-8 text-muted-foreground" />
              </div>
              <div className="flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium">{asset.name}</p>
                  <Badge variant="outline">{asset.type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {asset.size} · Added {asset.date} · Used in {asset.usedIn}{" "}
                  {asset.usedIn === 1 ? "post" : "posts"}
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
