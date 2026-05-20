import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  FileText,
  Users,
  Building2,
  ShoppingCart,
  FileCheck,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Trophy,
  Package,
  Clock,
} from "lucide-react";
import { Link, useLocation } from "wouter";

const navCards = [
  { href: "/quotes",          icon: ShoppingCart, label: "Quotes",          description: "Create and send professional quotes" },
  { href: "/purchase-orders", icon: FileCheck,    label: "Purchase Orders", description: "Raise and track supplier purchase orders" },
  { href: "/customers",       icon: Users,        label: "Customers",       description: "Customer contacts and account information" },
  { href: "/suppliers",       icon: Building2,    label: "Suppliers",       description: "Supplier contacts and PO email addresses" },
  { href: "/pricelists",      icon: FileText,     label: "Pricelists",      description: "Upload CSV pricelists and manage product pricing" },
];

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 space-y-2 ${accent ? "bg-primary/5 border-primary/20" : "bg-card"}`}>
      <div className="flex items-center gap-2">
        <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${accent ? "bg-primary/10" : "bg-muted"}`}>
          <Icon className={`h-3.5 w-3.5 ${accent ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`text-2xl font-bold tabular-nums ${accent ? "text-primary" : ""}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function activityLabel(item: { type: "quote" | "po"; number: string; status: string }) {
  const statusMap: Record<string, string> = {
    draft: "drafted",
    sent: "sent",
    accepted: "won",
    declined: "lost",
    received: "received",
    cancelled: "cancelled",
  };
  const prefix = item.type === "quote" ? "Quote" : "PO";
  return `${prefix} ${item.number} ${statusMap[item.status] ?? item.status}`;
}

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const firstName = user?.name?.split(" ")[0] ?? "there";

  const { data: stats, isLoading } = trpc.dashboard.getStats.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Heading */}
        <div className="pb-4 border-b">
          <h1 className="text-base font-semibold text-foreground">
            Welcome back, {firstName}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Here's your business at a glance.
          </p>
        </div>

        {/* Stats grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl border p-4 h-24 animate-pulse bg-muted/30" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={ShoppingCart}
              label="Quotes this month"
              value={String(stats.quotesThisMonth)}
              sub={`${stats.totalQuotes} total`}
            />
            <StatCard
              icon={Trophy}
              label="Win rate (month)"
              value={`${stats.winRate}%`}
              accent={stats.winRate >= 50}
            />
            <StatCard
              icon={DollarSign}
              label="Revenue this month"
              value={`$${stats.revenueThisMonth.toFixed(0)}`}
              sub="Won quotes ex GST"
              accent
            />
            <StatCard
              icon={Package}
              label="Open POs"
              value={String(stats.openPOs)}
              sub={stats.unpaidInvoices > 0 ? `${stats.unpaidInvoices} unpaid invoice${stats.unpaidInvoices !== 1 ? "s" : ""}` : undefined}
            />
          </div>
        ) : null}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent activity */}
          {stats && stats.recentActivity.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent Activity</h2>
              <div className="border rounded-lg overflow-hidden divide-y">
                {stats.recentActivity.map((item, i) => (
                  <button
                    key={i}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                    onClick={() => setLocation(item.type === "quote" ? `/quotes/${item.id}` : `/purchase-orders/${item.id}`)}
                  >
                    <div className={`h-2 w-2 rounded-full shrink-0 ${
                      item.status === "accepted" ? "bg-primary" :
                      item.status === "declined" ? "bg-destructive" :
                      item.status === "sent" ? "bg-amber-400" : "bg-muted-foreground/30"
                    }`} />
                    <span className="text-sm flex-1">{activityLabel(item)}</span>
                    <span className="text-xs text-muted-foreground">{timeAgo(item.updatedAt)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="space-y-2">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quick Actions</h2>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setLocation("/quotes")}
                className="flex items-center gap-3 rounded-lg border px-4 py-3 hover:bg-muted/50 transition-colors text-left"
              >
                <ShoppingCart className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">New Quote</span>
              </button>
              <button
                onClick={() => setLocation("/purchase-orders")}
                className="flex items-center gap-3 rounded-lg border px-4 py-3 hover:bg-muted/50 transition-colors text-left"
              >
                <FileCheck className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">New Purchase Order</span>
              </button>
              <button
                onClick={() => setLocation("/customers")}
                className="flex items-center gap-3 rounded-lg border px-4 py-3 hover:bg-muted/50 transition-colors text-left"
              >
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Add Customer</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Navigate</h2>
          <div className="border rounded-lg overflow-hidden divide-y">
            {navCards.map(({ href, icon: Icon, label, description }) => (
              <Link key={href} href={href}>
                <div className="group flex items-center gap-4 px-4 py-3.5 hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
