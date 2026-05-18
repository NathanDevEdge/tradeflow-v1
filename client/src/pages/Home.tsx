import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { FileText, Users, Building2, ShoppingCart, FileCheck, ArrowRight } from "lucide-react";
import { Link } from "wouter";

const navCards = [
  {
    href: "/pricelists",
    icon: FileText,
    label: "Pricelists",
    description: "Upload CSV pricelists and manage product pricing",
  },
  {
    href: "/customers",
    icon: Users,
    label: "Customers",
    description: "Customer contacts and account information",
  },
  {
    href: "/suppliers",
    icon: Building2,
    label: "Suppliers",
    description: "Supplier contacts and PO email addresses",
  },
  {
    href: "/quotes",
    icon: ShoppingCart,
    label: "Quotes",
    description: "Create and send professional quotes",
  },
  {
    href: "/purchase-orders",
    icon: FileCheck,
    label: "Purchase Orders",
    description: "Raise and track supplier purchase orders",
  },
];


export default function Home() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Page heading */}
        <div className="pb-4 border-b">
          <h1 className="text-base font-semibold text-foreground">
            Welcome back, {firstName}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Here's everything in one place.
          </p>
        </div>

        {/* Navigation — horizontal list */}
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
    </DashboardLayout>
  );
}
