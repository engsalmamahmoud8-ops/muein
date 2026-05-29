import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import type { RequestStatus } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

export type RequestCardData = {
  id: string;
  title: string;
  city: string | null;
  status: RequestStatus;
  created_at: string;
  category?: { name_ar: string; name_en: string; name_tr?: string | null } | null;
};

export function RequestCard({ req, basePath }: { req: RequestCardData; basePath: string }) {
  const { lang } = useI18n();
  const categoryName = req.category
    ? (lang === "en" ? req.category.name_en : lang === "tr" ? (req.category.name_tr ?? req.category.name_ar) : req.category.name_ar) || req.category.name_ar
    : null;
  return (
    <Link to={`${basePath}/${req.id}`}>
      <Card className="p-4 hover:shadow-elevated transition-shadow border-border/60 hover:border-primary/30">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground truncate">{req.title}</h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {categoryName && <span className="font-medium text-primary">{categoryName}</span>}
              {req.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{req.city}</span>}
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(req.created_at), "yyyy-MM-dd")}</span>
            </div>
          </div>
          <StatusBadge status={req.status} />
        </div>
      </Card>
    </Link>
  );
}
