import { format } from "date-fns";
import { useI18n } from "@/lib/i18n";
import { Circle } from "lucide-react";
import type { RequestStatus } from "@/lib/types";

export type TimelineEntry = {
  id: string;
  event_type: string;
  from_status: RequestStatus | null;
  to_status: RequestStatus | null;
  created_at: string;
  metadata?: Record<string, unknown> | null;
};

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  const { t } = useI18n();
  if (!entries.length) return <p className="text-sm text-muted-foreground">{t("no_data")}</p>;
  return (
    <ol className="relative space-y-4 ps-6 border-s-2 border-border">
      {entries.map(e => (
        <li key={e.id} className="relative">
          <span className="absolute -start-[29px] top-1 h-4 w-4 rounded-full bg-primary ring-4 ring-background flex items-center justify-center">
            <Circle className="h-1.5 w-1.5 fill-primary-foreground text-primary-foreground" />
          </span>
          <div className="text-sm">
            <p className="font-medium text-foreground">
              {e.event_type === "request_created" ? "تم إنشاء الطلب" : null}
              {e.event_type === "status_changed" && e.to_status ? `${t("status")}: ${t(`status_${e.to_status}` as never)}` : null}
              {!["request_created","status_changed"].includes(e.event_type) ? e.event_type : null}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(e.created_at), "yyyy-MM-dd HH:mm")}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
