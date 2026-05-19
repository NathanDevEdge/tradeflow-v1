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
      "Upload supplier pricelists with buy prices and RRP, then set your own sell margins. Update hundreds of items at once — no formulas, no copy-pasting.",
  },
  {
    icon: TrendingUp,
    title: "Live Margin Tracking",
    description:
      "See exactly what you're making on every line as you build a quote. Know your profit before you click send.",
  },
  {
    icon: FileCheck,
    title: "Professional PDFs",
    description:
      "Branded quotes for customers. Clean POs for suppliers. Your buy prices and margins are never visible to anyone but you.",
  },
  {
    icon: Mail,
    title: "One-Click PO Emails",
    description:
      "Fire purchase orders straight to suppliers the moment a quote is accepted. Use your own email address or ours.",
  },
  {
    icon: Users,
    title: "Customer & Supplier Database",
    description:
      "All your contacts, billing addresses, and notes in one place. Every quote and PO automatically linked to the right party.",
  },
  {
    icon: Building2,
    title: "Multi-User Access",
    description:
      "Add your team with role-based permissions. Everyone works in the same system — no more emailing spreadsheets around.",
  },
];

const comparisonRows = [
  { feature: "Setup time", tradeflow: "5 minutes", spreadsheet: "Hours of formatting", enterprise: "Weeks of training", highlight: true },
  { feature: "Live margin tracking", tradeflow: true, spreadsheet: false, enterprise: true, highlight: false },
  { feature: "Professional PDFs", tradeflow: true, spreadsheet: false, enterprise: true, highlight: false },
  { feature: "Margins hidden from customers", tradeflow: true, spreadsheet: false, enterprise: true, highlight: false },
  { feature: "One-click PO emails", tradeflow: true, spreadsheet: false, enterprise: true, highlight: false },
  { feature: "Monthly cost", tradeflow: "$40", spreadsheet: "Free (but costly errors)", enterprise: "$200+ per user", highlight: true },
  { feature: "Complexity", tradeflow: "Simple", spreadsheet: "Error-prone", enterprise: "Overwhelming", highlight: false },
  { feature: "Best for", tradeflow: "Small trade businesses", spreadsheet: "Hobbyists", enterprise: "Large enterprises", highlight: true },
];

const faqs = [
  {
    q: "Can I try TradeFlow before committing?",
    a: "Yes. Use the demo account (demo@devedge.com.au / demo123!) to explore all features before you sign up.",
  },
  {
    q: "How long does setup actually take?",
    a: "Most businesses are live within 5 minutes. Upload your supplier pricelist, add a customer, and send your first quote. That's it.",
  },
  {
    q: "Can I switch between monthly and annual?",
    a: "Absolutely. Switch to annual at any time and we'll prorate your remaining subscription.",
  },
  {
    q: "What happens to my data if I cancel?",
    a: "Export everything before you go. We keep your data for 30 days after cancellation in case you change your mind.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. Everything is encrypted in transit and at rest, hosted in Australia, and backed up daily.",
  },
  {
    q: "Do my customers ever see my buy prices?",
    a: "Never. Customer PDFs show only what you've quoted. Your margins and supplier costs stay completely hidden.",
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
      <nav className="border-b border-border bg-background/95 sticky top-0 z-50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <img src="/logo.svg" alt="TradeFlow" className="h-7 object-contain" />

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
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-0 md:pt-24 md:pb-0">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Left: text */}
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted text-xs font-medium text-muted-foreground">
              Built for Australian trade businesses
            </div>
            <h1 className="text-4xl md:text-5xl xl:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
              Stop quoting from<br />
              <span className="text-primary">spreadsheets.</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
              Pricelists, quotes, and purchase orders — with live margin tracking so you always know your profit before you send.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" onClick={() => setLocation("/subscribe")} className="px-8">
                Start free trial
              </Button>
              <Button size="lg" variant="outline" onClick={() => scrollTo("features")} className="px-8">
                See how it works
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              No lock-in · Cancel anytime · Australian hosted
            </p>
          </div>

          {/* Right: app mockup — flush with hero bottom */}
          <div className="hidden lg:block self-end">
            <AppMockup />
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-border bg-muted/30 mt-12">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "$40", label: "per month, all inclusive" },
              { value: "5 min", label: "to import your first pricelist" },
              { value: "AUS", label: "hosted and supported" },
              { value: "100%", label: "margin separation on PDFs" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-bold text-primary">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-muted/50 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="mb-14 max-w-xl">
            <h2 className="text-3xl font-bold tracking-tight">
              The tools your business actually needs
            </h2>
            <p className="text-muted-foreground mt-2">
              Purpose-built for installers, retailers, and wholesalers. Nothing bloated. Nothing missing.
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
          <h2 className="text-3xl font-bold tracking-tight">Why not just use Excel?</h2>
          <p className="text-muted-foreground mt-2">
            Because one pricing mistake costs more than a year of TradeFlow.
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

      {/* Pricing */}
      <section id="pricing" className="bg-muted/50 border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="mb-14">
            <h2 className="text-3xl font-bold tracking-tight">One price. Everything included.</h2>
            <p className="text-muted-foreground mt-2">No per-seat fees. No feature tiers. No surprises.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl">
            {/* Monthly */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly</CardTitle>
                <CardDescription>Pay as you go, cancel any time</CardDescription>
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
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="mb-14">
          <h2 className="text-3xl font-bold tracking-tight">Common questions</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-x-12 gap-y-8 max-w-4xl">
          {faqs.map(({ q, a }) => (
            <div key={q}>
              <p className="font-semibold text-sm leading-snug">{q}</p>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="bg-muted/50 border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="max-w-xl">
            <div className="mb-10">
              <h2 className="text-3xl font-bold tracking-tight">Get in touch</h2>
              <p className="text-muted-foreground mt-2">
                Questions before signing up? Want to request access for your team? We'll get back to you within 24 hours.
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
        </div>
      </section>

      {/* CTA banner */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div
          className="rounded-2xl p-12 text-center space-y-6"
          style={{ background: "var(--sidebar)" }}
        >
          <p
            className="text-2xl md:text-3xl font-bold tracking-tight"
            style={{ color: "var(--sidebar-foreground)" }}
          >
            Ready to quote like a pro?
          </p>
          <p className="text-sm" style={{ color: "oklch(0.75 0.04 185)" }}>
            Join Australian trade businesses already using TradeFlow to win more work.
          </p>
          <Button size="lg" variant="secondary" onClick={() => setLocation("/login")} className="text-base px-8">
            Get started now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <img src="/logo.svg" alt="TradeFlow" className="h-6 object-contain" />

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Brought to you by</span>
            <div className="bg-black px-2.5 py-1 rounded-md">
              <img
                src="/devedge-wordmark.png"
                alt="DevEdge"
                className="h-5 object-contain"
              />
            </div>
          </div>

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
    { num: "Q00019", customer: "ProFit Shopfitters", status: "sent", amount: "$2,340.00" },
  ];
  return (
    <div
      className="rounded-t-xl border border-b-0 border-border overflow-hidden select-none"
      style={{
        boxShadow: "0 -8px 40px -8px oklch(0.58 0.14 185 / 0.18), 0 -2px 12px -4px oklch(0.58 0.14 185 / 0.12)",
      }}
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-border bg-muted/60">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400/50" />
        <div className="h-2.5 w-2.5 rounded-full bg-amber-400/50" />
        <div className="h-2.5 w-2.5 rounded-full bg-green-400/50" />
        <div className="flex-1 mx-3 bg-background rounded border border-border px-2 py-0.5 text-center text-muted-foreground" style={{ fontSize: "10px" }}>
          tradeflow.devedge.com.au/quotes
        </div>
      </div>
      {/* App shell */}
      <div className="flex" style={{ height: "340px" }}>
        {/* Sidebar */}
        <div className="w-40 border-r border-border/30 flex flex-col py-2 shrink-0" style={{ background: "var(--sidebar)" }}>
          <div className="px-3 py-2 mb-2">
            <img src="/logo.svg" alt="TradeFlow" className="h-5 object-contain" style={{ filter: "brightness(0) invert(1)", opacity: 0.9 }} />
          </div>
          {navItems.map((item) => (
            <div
              key={item}
              className="mx-2 px-2.5 py-1.5 rounded-md"
              style={{
                fontSize: "10.5px",
                background: item === "Quotes" ? "oklch(1 0 0 / 0.12)" : "transparent",
                color: item === "Quotes" ? "oklch(0.95 0.02 185)" : "oklch(0.68 0.05 185)",
                fontWeight: item === "Quotes" ? 600 : 400,
              }}
            >
              {item}
            </div>
          ))}
        </div>
        {/* Main */}
        <div className="flex-1 p-4 bg-background overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs">Quotes</span>
              <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">5</span>
            </div>
            <div className="bg-primary text-primary-foreground rounded-md px-2.5 py-1 font-medium" style={{ fontSize: "10px" }}>
              + New Quote
            </div>
          </div>
          <div className="rounded-md border border-border overflow-hidden">
            <div
              className="grid px-3 py-2 bg-muted/50"
              style={{ gridTemplateColumns: "70px 1fr 58px 68px", gap: "8px", fontSize: "9px", color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}
            >
              <span>Quote #</span><span>Customer</span><span>Status</span><span className="text-right">Total</span>
            </div>
            {rows.map((row, i) => (
              <div
                key={row.num}
                className="grid px-3 py-2 items-center border-t border-border"
                style={{ gridTemplateColumns: "70px 1fr 58px 68px", gap: "8px", fontSize: "10.5px", background: i % 2 === 1 ? "oklch(0.975 0.002 185)" : undefined }}
              >
                <span className="font-medium text-primary">{row.num}</span>
                <span style={{ color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.customer}</span>
                <span>
                  <span
                    className="px-1.5 py-0.5 rounded-full"
                    style={{
                      fontSize: "8.5px",
                      fontWeight: 600,
                      background: row.status === "accepted"
                        ? "oklch(0.58 0.14 185 / 0.12)"
                        : row.status === "sent"
                        ? "oklch(0.85 0.1 85 / 0.3)"
                        : "oklch(0.93 0.01 70)",
                      color: row.status === "accepted"
                        ? "var(--primary)"
                        : row.status === "sent"
                        ? "oklch(0.45 0.12 85)"
                        : "var(--muted-foreground)",
                    }}
                  >
                    {row.status}
                  </span>
                </span>
                <span className="text-right font-semibold" style={{ fontVariantNumeric: "tabular-nums", fontSize: "10.5px" }}>{row.amount}</span>
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
