import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Check,
  FileText,
  TrendingUp,
  Users,
  Building2,
  Mail,
  X,
  FileCheck,
} from "lucide-react";
import { useLocation } from "wouter";
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const features = [
  {
    icon: FileText,
    title: "CSV Pricelist Management",
    description:
      "Upload supplier pricelists with buy prices, RRP, and custom sell prices. Bulk-edit items with ease.",
  },
  {
    icon: Users,
    title: "Customer Database",
    description:
      "Store customer contacts, billing addresses, and notes. Every quote is tracked against the right customer.",
  },
  {
    icon: Building2,
    title: "Supplier Management",
    description:
      "Manage supplier contacts and PO email addresses for streamlined ordering.",
  },
  {
    icon: TrendingUp,
    title: "Live Margin Tracking",
    description:
      "See real-time margin calculations as you build quotes. Know your profit before you send.",
  },
  {
    icon: FileCheck,
    title: "Professional PDFs",
    description:
      "Generate customer quotes and supplier POs with strict data separation — your margins stay internal.",
  },
  {
    icon: Mail,
    title: "Email Integration",
    description:
      "Send purchase orders directly to suppliers in one click. Connect your own SMTP or use our default.",
  },
];


const comparisonRows = [
  { feature: "Setup time", tradeflow: "5 minutes", spreadsheet: "Hours of formatting", enterprise: "Weeks of training", highlight: true },
  { feature: "Live margin tracking", tradeflow: true, spreadsheet: false, enterprise: true, highlight: false },
  { feature: "Professional PDFs", tradeflow: true, spreadsheet: false, enterprise: true, highlight: false },
  { feature: "Data separation", tradeflow: true, spreadsheet: false, enterprise: true, highlight: false },
  { feature: "Email integration", tradeflow: true, spreadsheet: false, enterprise: true, highlight: false },
  { feature: "Monthly cost", tradeflow: "$40", spreadsheet: "Free (but costly errors)", enterprise: "$200+ per user", highlight: true },
  { feature: "Complexity", tradeflow: "Simple", spreadsheet: "Error-prone", enterprise: "Overwhelming", highlight: false },
  { feature: "Perfect for", tradeflow: "Small wholesale businesses", spreadsheet: "Hobbyists", enterprise: "Large enterprises", highlight: true },
];

const faqs = [
  {
    q: "Can I try TradeFlow before committing?",
    a: "Yes! Use our demo account (demo@devedge.com.au / demo123!) to explore all features before signing up.",
  },
  {
    q: "What happens to my data if I cancel?",
    a: "You can export all your data before cancelling. We retain it for 30 days after cancellation in case you change your mind.",
  },
  {
    q: "Can I switch between monthly and annual plans?",
    a: "Absolutely. You can upgrade to annual at any time and we'll prorate your existing subscription.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. All data is encrypted in transit and at rest. We use industry-standard security practices and regular backups.",
  },
];

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [contactForm, setContactForm] = React.useState({ name: "", email: "", company: "", message: "" });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);

  const submitMutation = trpc.contact.submit.useMutation({
    onSuccess: () => {
      toast.success("Message sent!");
      setSubmitSuccess(true);
      setContactForm({ name: "", email: "", company: "", message: "" });
      setIsSubmitting(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send. Please try again.");
      setIsSubmitting(false);
    },
  });

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border bg-background/95 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <img src="/logo.png" alt="TradeFlow" className="h-8 object-contain" />

          <div className="hidden md:flex items-center gap-6">
            {["features", "comparison", "pricing", "contact"].map((id) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors capitalize"
              >
                {id === "comparison" ? "Compare" : id.charAt(0).toUpperCase() + id.slice(1)}
              </button>
            ))}
            <Button onClick={() => setLocation("/login")}>Log in</Button>
          </div>

          <Button className="md:hidden" onClick={() => setLocation("/login")}>
            Log in
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: text */}
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted text-xs font-medium text-muted-foreground">
              Built for Australian small business
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
              Better than Spreadsheets,<br />
              <span className="text-primary">Cheaper than the rest.</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Quotes, purchase orders, and supplier management — built for installers, retailers, and builders who want professional tools without the enterprise price tag.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" onClick={() => setLocation("/login")} className="px-8">
                Get started
              </Button>
              <Button size="lg" variant="outline" onClick={() => scrollTo("pricing")} className="px-8">
                View pricing
              </Button>
            </div>
          </div>

          {/* Right: app mockup */}
          <div className="hidden lg:block">
            <AppMockup />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-muted/50 border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="mb-14">
            <h2 className="text-3xl font-bold tracking-tight">
              Everything you need to run your business
            </h2>
            <p className="text-muted-foreground mt-2">
              Powerful features designed for wholesale distribution — nothing you don't need.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-4">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{title}</p>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section id="comparison" className="max-w-6xl mx-auto px-6 py-20">
        <div className="mb-14">
          <h2 className="text-3xl font-bold tracking-tight">Why choose TradeFlow?</h2>
          <p className="text-muted-foreground mt-2">
            See how we compare to traditional methods and complex enterprise software.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Feature</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-primary uppercase tracking-wide">TradeFlow</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Spreadsheets</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map(({ feature, tradeflow, spreadsheet, enterprise }, i) => (
                <tr key={feature} className={`border-b border-border last:border-0 ${i % 2 === 1 ? "bg-muted/30" : ""}`}>
                  <td className="px-5 py-3.5 text-sm font-medium">{feature}</td>
                  <td className="text-center px-5 py-3.5">
                    {typeof tradeflow === "boolean" ? (
                      tradeflow
                        ? <Check className="h-4 w-4 text-primary mx-auto" />
                        : <X className="h-4 w-4 text-destructive/60 mx-auto" />
                    ) : (
                      <span className="text-sm font-semibold text-primary">{tradeflow}</span>
                    )}
                  </td>
                  <td className="text-center px-5 py-3.5">
                    {typeof spreadsheet === "boolean" ? (
                      spreadsheet
                        ? <Check className="h-4 w-4 text-primary mx-auto" />
                        : <X className="h-4 w-4 text-destructive/60 mx-auto" />
                    ) : (
                      <span className="text-sm text-muted-foreground">{spreadsheet}</span>
                    )}
                  </td>
                  <td className="text-center px-5 py-3.5">
                    {typeof enterprise === "boolean" ? (
                      enterprise
                        ? <Check className="h-4 w-4 text-primary mx-auto" />
                        : <X className="h-4 w-4 text-destructive/60 mx-auto" />
                    ) : (
                      <span className="text-sm text-muted-foreground">{enterprise}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "$40", label: "per month, all-in" },
              { value: "5 min", label: "to set up and go live" },
              { value: "AUS", label: "hosted and supported" },
              { value: "100%", label: "data separation on PDFs" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-bold text-primary">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20">
        <div className="mb-14">
          <h2 className="text-3xl font-bold tracking-tight">Simple, transparent pricing</h2>
          <p className="text-muted-foreground mt-2">One plan, everything included. No per-seat surprises.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl">
          {/* Monthly */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly</CardTitle>
              <CardDescription>Pay as you go, cancel anytime</CardDescription>
              <div className="pt-2">
                <span className="text-4xl font-bold">$40</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <PlanFeatures />
              <Button className="w-full" onClick={() => setLocation("/login")}>
                Get started
              </Button>
            </CardContent>
          </Card>

          {/* Annual — featured */}
          <Card className="border-primary relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-0.5 rounded-full text-xs font-semibold">
              Save 17%
            </div>
            <CardHeader>
              <CardTitle>Annual</CardTitle>
              <CardDescription>Best value — $33.25/month billed yearly</CardDescription>
              <div className="pt-2">
                <span className="text-4xl font-bold">$399</span>
                <span className="text-muted-foreground text-sm">/year</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <PlanFeatures extras={["Save $81 per year"]} />
              <Button className="w-full" onClick={() => setLocation("/login")}>
                Get started
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-muted/50 border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="mb-14">
            <h2 className="text-3xl font-bold tracking-tight">Frequently asked questions</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-8 max-w-4xl">
            {faqs.map(({ q, a }) => (
              <div key={q}>
                <p className="font-semibold text-sm leading-snug">{q}</p>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="max-w-6xl mx-auto px-6 py-20">
        <div className="max-w-xl">
          <div className="mb-10">
            <h2 className="text-3xl font-bold tracking-tight">Get in touch</h2>
            <p className="text-muted-foreground mt-2">
              Questions? Want to request access? We'd love to hear from you.
            </p>
          </div>

          {submitSuccess ? (
            <div className="flex flex-col items-start gap-4 py-8">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Message received</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  We'll get back to you within 24 hours.
                </p>
              </div>
              <Button variant="outline" onClick={() => setSubmitSuccess(false)}>
                Send another
              </Button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setIsSubmitting(true);
                submitMutation.mutate(contactForm);
              }}
              className="space-y-5"
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="c-name">Name *</Label>
                  <Input
                    id="c-name"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    required
                    disabled={isSubmitting}
                    placeholder="Jane Smith"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-email">Email *</Label>
                  <Input
                    id="c-email"
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    required
                    disabled={isSubmitting}
                    placeholder="jane@example.com"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-company">Company</Label>
                <Input
                  id="c-company"
                  value={contactForm.company}
                  onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                  disabled={isSubmitting}
                  placeholder="Your company name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-message">Message *</Label>
                <Textarea
                  id="c-message"
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  required
                  disabled={isSubmitting}
                  placeholder="Tell us about your business and how TradeFlow can help…"
                  rows={5}
                />
              </div>
              <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting ? "Sending…" : "Send message"}
              </Button>
            </form>
          )}
        </div>
      </section>

      {/* CTA banner */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div
          className="rounded-2xl p-12 text-center space-y-6"
          style={{ background: "var(--sidebar)" }}
        >
          <p
            className="text-2xl md:text-3xl font-bold tracking-tight"
            style={{ color: "var(--sidebar-foreground)" }}
          >
            Ready to ditch the spreadsheets?
          </p>
          <p className="text-sm" style={{ color: "oklch(0.75 0.04 185)" }}>
            Join businesses already using TradeFlow to manage their wholesale operations.
          </p>
          <Button size="lg" variant="secondary" onClick={() => setLocation("/login")} className="text-base px-8">
            Get started now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row justify-between items-center gap-4">
          <img src="/logo.png" alt="TradeFlow" className="h-7 object-contain" />
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} TradeFlow. All rights reserved.
          </p>
          <button
            className="text-sm text-primary hover:text-primary/80 transition-colors"
            onClick={() => setLocation("/login")}
          >
            Already a customer? Log in →
          </button>
        </div>
      </footer>
    </div>
  );
}

function AppMockup() {
  const navItems = ["Dashboard", "Pricelists", "Customers", "Quotes", "Purchase Orders"];
  const rows = [
    { num: "Q00023", customer: "Apex Installations", status: "accepted", amount: "$3,240.00" },
    { num: "Q00022", customer: "BlueLine Plumbing", status: "sent", amount: "$1,890.00" },
    { num: "Q00021", customer: "CoreBuild Pty Ltd", status: "draft", amount: "$745.50" },
    { num: "Q00020", customer: "Summit Electrical", status: "accepted", amount: "$5,110.00" },
  ];
  return (
    <div className="rounded-xl border border-border shadow-xl overflow-hidden select-none">
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-b bg-muted/60">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400/50" />
        <div className="h-2.5 w-2.5 rounded-full bg-amber-400/50" />
        <div className="h-2.5 w-2.5 rounded-full bg-green-400/50" />
        <div className="flex-1 mx-3 bg-background rounded border px-2 py-0.5 text-center text-muted-foreground" style={{ fontSize: "10px" }}>
          tradeflow.devedge.com.au/quotes
        </div>
      </div>
      {/* App shell */}
      <div className="flex" style={{ height: "300px" }}>
        {/* Sidebar */}
        <div className="w-36 border-r flex flex-col py-2 shrink-0" style={{ background: "var(--sidebar)" }}>
          <div className="px-3 py-2 mb-1">
            <span className="text-xs font-semibold" style={{ color: "var(--sidebar-foreground)", fontSize: "11px" }}>TradeFlow</span>
          </div>
          {navItems.map((item) => (
            <div
              key={item}
              className="mx-2 px-2 py-1.5 rounded-md"
              style={{
                fontSize: "10px",
                background: item === "Quotes" ? "var(--sidebar-primary)" : "transparent",
                color: item === "Quotes" ? "var(--sidebar-primary-foreground)" : "oklch(0.75 0.04 185)",
                fontWeight: item === "Quotes" ? 500 : 400,
              }}
            >
              {item}
            </div>
          ))}
        </div>
        {/* Main */}
        <div className="flex-1 p-3 bg-background overflow-hidden">
          <div className="flex items-center justify-between pb-2 mb-3 border-b">
            <span className="font-semibold" style={{ fontSize: "11px" }}>Quotes</span>
            <div className="bg-primary text-primary-foreground rounded px-2 py-0.5 font-medium" style={{ fontSize: "10px" }}>
              + New Quote
            </div>
          </div>
          <div className="rounded border overflow-hidden">
            <div className="grid px-2 py-1.5 bg-muted/50" style={{ gridTemplateColumns: "80px 1fr 60px 70px", gap: "8px", fontSize: "9px", color: "var(--muted-foreground)", fontWeight: 500 }}>
              <span>Quote #</span><span>Customer</span><span>Status</span><span className="text-right">Total</span>
            </div>
            {rows.map((row, i) => (
              <div
                key={row.num}
                className="grid px-2 py-1.5 items-center border-t"
                style={{ gridTemplateColumns: "80px 1fr 60px 70px", gap: "8px", fontSize: "10px", background: i % 2 === 1 ? "oklch(0.97 0.003 70)" : undefined }}
              >
                <span style={{ fontWeight: 500 }}>{row.num}</span>
                <span style={{ color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.customer}</span>
                <span>
                  <span
                    className="px-1.5 py-0.5 rounded"
                    style={{
                      fontSize: "8px",
                      fontWeight: 500,
                      background: row.status === "accepted" ? "oklch(0.58 0.14 185 / 0.12)" : row.status === "sent" ? "oklch(0.85 0.1 85 / 0.3)" : "oklch(0.93 0.01 70)",
                      color: row.status === "accepted" ? "var(--primary)" : row.status === "sent" ? "oklch(0.45 0.12 85)" : "var(--muted-foreground)",
                    }}
                  >
                    {row.status}
                  </span>
                </span>
                <span className="text-right" style={{ fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{row.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanFeatures({ extras = [] }: { extras?: string[] }) {
  const base = [
    "Unlimited pricelists and items",
    "Unlimited customers and suppliers",
    "Unlimited quotes and purchase orders",
    "PDF generation and email delivery",
    "Real-time margin tracking",
    "Cloud storage for all documents",
  ];

  return (
    <ul className="space-y-2.5">
      {[...base, ...extras].map((item) => (
        <li key={item} className="flex items-center gap-2.5 text-sm">
          <Check className="h-4 w-4 text-primary shrink-0" />
          <span className={extras.includes(item) ? "font-medium" : ""}>{item}</span>
        </li>
      ))}
    </ul>
  );
}
