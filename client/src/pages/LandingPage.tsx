import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, FileText, TrendingUp, Users, Building2, Mail, Zap } from "lucide-react";
import { useLocation } from "wouter";

export default function LandingPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">TradeFlow</span>
          </div>
          <Button onClick={() => setLocation("/login")} variant="default">
            Log In
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Streamline Your Wholesale Operations
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Manage pricing, create professional quotes, and generate purchase orders—all in one place. Built for installers, retailers, and builders.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => setLocation("/login")} className="text-lg px-8">
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => {
              document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
            }} className="text-lg px-8">
              View Pricing
            </Button>
          </div>

        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Run Your Business</h2>
            <p className="text-xl text-muted-foreground">Powerful features designed for wholesale distribution</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <FileText className="h-10 w-10 text-blue-600 mb-2" />
                <CardTitle>CSV Pricelist Management</CardTitle>
                <CardDescription>
                  Upload and manage product pricelists with buy prices, RRP, and custom sell prices. Bulk edit items with ease.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-10 w-10 text-blue-600 mb-2" />
                <CardTitle>Customer Database</CardTitle>
                <CardDescription>
                  Store customer contacts, billing addresses, and notes. Track all quotes linked to each customer.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Building2 className="h-10 w-10 text-blue-600 mb-2" />
                <CardTitle>Supplier Management</CardTitle>
                <CardDescription>
                  Manage supplier information, PO email addresses, and contact details for streamlined ordering.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="h-10 w-10 text-blue-600 mb-2" />
                <CardTitle>Margin Tracking</CardTitle>
                <CardDescription>
                  See real-time margin calculations on every quote. Track profitability per item and total quote value.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <FileText className="h-10 w-10 text-blue-600 mb-2" />
                <CardTitle>Professional PDFs</CardTitle>
                <CardDescription>
                  Generate customer-facing quotes and supplier purchase orders with strict data separation—margins stay internal.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Mail className="h-10 w-10 text-blue-600 mb-2" />
                <CardTitle>Email Integration</CardTitle>
                <CardDescription>
                  Send purchase orders directly to suppliers via email with one click. Keep communication streamlined.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-muted-foreground">Choose the plan that works for your business</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Monthly Plan */}
            <Card className="relative">
              <CardHeader>
                <CardTitle className="text-2xl">Monthly</CardTitle>
                <CardDescription>Perfect for getting started</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$40</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span>Unlimited pricelists and items</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span>Unlimited customers and suppliers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span>Unlimited quotes and purchase orders</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span>PDF generation and email delivery</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span>Real-time margin tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span>Cloud storage for all documents</span>
                  </li>
                </ul>
                <Button className="w-full mt-6" size="lg" onClick={() => setLocation("/login")}>
                  Start Monthly Plan
                </Button>
              </CardContent>
            </Card>

            {/* Annual Plan */}
            <Card className="relative border-blue-600 border-2">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                Save 17%
              </div>
              <CardHeader>
                <CardTitle className="text-2xl">Annual</CardTitle>
                <CardDescription>Best value for committed users</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$399</span>
                  <span className="text-muted-foreground">/year</span>
                </div>
                <p className="text-sm text-muted-foreground">That's just $33.25/month</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span>Unlimited pricelists and items</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span>Unlimited customers and suppliers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span>Unlimited quotes and purchase orders</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span>PDF generation and email delivery</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span>Real-time margin tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span>Cloud storage for all documents</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <span className="font-semibold">Save $81 per year</span>
                  </li>
                </ul>
                <Button className="w-full mt-6" size="lg" onClick={() => setLocation("/login")}>
                  Start Annual Plan
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-4 py-20 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Can I try TradeFlow before committing?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes! Use our demo account (demo@devedge.com.au / demo123!) to explore all features before signing up.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What happens to my data if I cancel?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  You can export all your data before canceling. We retain your data for 30 days after cancellation in case you change your mind.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Can I switch between monthly and annual plans?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Absolutely! You can upgrade to annual at any time and we'll prorate your existing subscription.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Is my data secure?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes. All data is encrypted in transit and at rest. We use industry-standard security practices and regular backups.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8 bg-blue-600 text-white rounded-2xl p-12">
          <h2 className="text-3xl md:text-4xl font-bold">Ready to streamline your operations?</h2>
          <p className="text-xl opacity-90">
            Join businesses already using TradeFlow to manage their wholesale distribution
          </p>
          <Button size="lg" variant="secondary" onClick={() => setLocation("/login")} className="text-lg px-8">
            Get Started Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-slate-50">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold">TradeFlow</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 TradeFlow. All rights reserved.
            </p>
            <Button variant="link" onClick={() => setLocation("/login")}>
              Already a customer? Log in
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
