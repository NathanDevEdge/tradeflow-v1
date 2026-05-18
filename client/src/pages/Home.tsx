import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

const steps = [
  {
    n: 1,
    title: "Upload Pricelists",
    body: "Import your supplier CSV pricelists — TradeFlow reads the pricing automatically.",
  },
  {
    n: 2,
    title: "Add Customers & Suppliers",
    body: "Create records with contact details so quotes and POs can be sent in one click.",
  },
  {
    n: 3,
    title: "Create Quotes & Purchase Orders",
    body: "Build a quote, see the margin live, and convert it to a PO when the job is confirmed.",
  },
];

export default function Home() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl">
        {/* Page heading */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back, {firstName}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's everything in one place — quotes, orders, customers, and pricing.
          </p>
        </div>

        {/* Navigation cards */}
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
            Quick access
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {navCards.map(({ href, icon: Icon, label, description }) => (
              <Link key={href} href={href}>
                <Card className="group hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <CardTitle className="text-sm font-semibold mt-3">{label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Getting started */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Getting started</CardTitle>
            <CardDescription>Three steps to get the most out of TradeFlow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {steps.map(({ n, title, body }) => (
              <div key={n} className="flex items-start gap-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  {n}
                </div>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{body}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
