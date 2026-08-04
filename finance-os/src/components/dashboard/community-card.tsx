import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Glyph } from "@/components/ui/glyph";
import type { CommunityActivityItem } from "@/lib/types";

export function CommunityCard({ items }: { items: CommunityActivityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Community</CardTitle>
      </CardHeader>
      <div className="flex flex-col divide-y divide-border">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
            <Glyph label={item.actorGlyph} size={28} />
            <div className="min-w-0">
              <div className="text-[13px] text-text-primary">
                <span className="font-medium">{item.actorName}</span> {item.action}
              </div>
              <div className="text-[11.5px] text-text-muted">{item.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
