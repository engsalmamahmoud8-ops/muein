import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import type { RequestStatus } from "@/lib/types";

const COLORS: Record<RequestStatus, string> = {
  pending: "bg-slate-100 text-slate-700 border-slate-200",
  applications_received: "bg-blue-100 text-blue-700 border-blue-200",
  assigned: "bg-indigo-100 text-indigo-700 border-indigo-200",
  on_the_way: "bg-cyan-100 text-cyan-700 border-cyan-200",
  inspection_started: "bg-violet-100 text-violet-700 border-violet-200",
  quotation_provided: "bg-amber-100 text-amber-700 border-amber-200",
  customer_approved_quotation: "bg-lime-100 text-lime-700 border-lime-200",
  work_in_progress: "bg-orange-100 text-orange-700 border-orange-200",
  waiting_customer_response: "bg-yellow-100 text-yellow-700 border-yellow-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  disputed: "bg-rose-100 text-rose-700 border-rose-200",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  const { t } = useI18n();
  return (
    <Badge variant="outline" className={`${COLORS[status]} font-medium`}>
      {t(`status_${status}` as never)}
    </Badge>
  );
}
