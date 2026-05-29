import { Card } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";

export function StatCard({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: LucideIcon; accent?: string }) {
  return (
    <Card className="group p-5 shadow-card hover:shadow-elevated transition-shadow border-border/60">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{value}</p>
        </div>
        <div
          className={`h-11 w-11 rounded-xl flex items-center justify-center transition-colors ${
            accent ?? "bg-neutral-200 text-black group-hover:bg-yellow-300 group-hover:text-black"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4"><Icon className="h-7 w-7 text-muted-foreground" /></div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
      ))}
    </div>
  );
}
