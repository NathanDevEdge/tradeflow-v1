import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Check,
  FileText,
  TrendingUp,
  Users,
  Building2,
  Mail,
  Shield,
  Clock,
  MapPin,
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

const trustItems = [
  {
    icon: MapPin,
    title: "Australian-Based",
    body: "Hosted in Australia with local support and data sovereignty.",
  },
  {
    icon: Shield,
    title: "Secure by Default",
    body: "256-bit encryption, secure backups, and industry-standard infrastructure.",
  },
  {
    icon: Clock,
    title: "99.9% Uptime",
    body: "Reliable infrastructure with automatic backups and monitoring.",
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
      <section className="max-w-6xl mx-auto px-6 py-24 md:py-36">
        <div className="max-w-3xl space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted text-xs font-medium text-muted-foreground">
            Built for Australian small business
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-tight">
            Better than Spreadsheets,<br className="hidden md:block" />
            <span className="text-primary"> Cheaper than the rest.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
            Quotes, purchase orders, and supplier management — built for installers, retailers, and builders who want professional tools without the enterprise price tag.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" onClick={() => setLocation("/login")} className="text-base px-8">
              Get started
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => scrollTo("pricing")}
              className="text-base px-8"
            >
              View pricing
            </Button>
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

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="bg-card">
                <CardHeader className="pb-2">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-semibold">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {description}
                  </CardDescription>
                </CardContent>
              </Card>
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

      {/* Trust indicators */}
      <section className="bg-muted/50 border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-3 gap-10 text-center">
            {trustItems.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex flex-col items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <p className="font-semibold text-sm">{title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
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
          <div className="grid md:grid-cols-2 gap-5 max-w-4xl">
            {faqs.map(({ q, a }) => (
              <Card key={q}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold leading-snug">{q}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
                </CardContent>
              </Card>
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
