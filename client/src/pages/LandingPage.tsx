import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, FileText, TrendingUp, Users, Building2, Mail, Zap, Shield, Clock, MapPin, X } from "lucide-react";
import { useLocation } from "wouter";
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const [contactForm, setContactForm] = React.useState({ name: "", email: "", company: "", message: "" });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitSuccess, setSubmitSuccess] = React.useState(false);

  const submitMutation = trpc.contact.submit.useMutation({
    onSuccess: () => {
      toast.success("Message sent successfully!");
      setSubmitSuccess(true);
      setContactForm({ name: "", email: "", company: "", message: "" });
      setIsSubmitting(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send message. Please try again.");
      setIsSubmitting(false);
    },
  });

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

      {/* Comparison Table Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose TradeFlow?</h2>
            <p className="text-xl text-muted-foreground">See how we compare to traditional methods and complex enterprise software</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left p-4 font-semibold">Feature</th>
                  <th className="text-center p-4 font-semibold text-blue-600">TradeFlow</th>
                  <th className="text-center p-4 font-semibold text-muted-foreground">Manual Spreadsheets</th>
                  <th className="text-center p-4 font-semibold text-muted-foreground">Enterprise Software</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="p-4 font-medium">Setup Time</td>
                  <td className="text-center p-4"><span className="text-green-600 font-semibold">5 minutes</span></td>
                  <td className="text-center p-4 text-muted-foreground">Hours of formatting</td>
                  <td className="text-center p-4 text-muted-foreground">Weeks of training</td>
                </tr>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <td className="p-4 font-medium">Margin Tracking</td>
                  <td className="text-center p-4"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  <td className="text-center p-4"><X className="h-5 w-5 text-red-500 mx-auto" /></td>
                  <td className="text-center p-4"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-4 font-medium">Professional PDFs</td>
                  <td className="text-center p-4"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  <td className="text-center p-4"><X className="h-5 w-5 text-red-500 mx-auto" /></td>
                  <td className="text-center p-4"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                </tr>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <td className="p-4 font-medium">Data Separation</td>
                  <td className="text-center p-4"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  <td className="text-center p-4"><X className="h-5 w-5 text-red-500 mx-auto" /></td>
                  <td className="text-center p-4"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-4 font-medium">Email Integration</td>
                  <td className="text-center p-4"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                  <td className="text-center p-4"><X className="h-5 w-5 text-red-500 mx-auto" /></td>
                  <td className="text-center p-4"><Check className="h-5 w-5 text-green-600 mx-auto" /></td>
                </tr>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <td className="p-4 font-medium">Monthly Cost</td>
                  <td className="text-center p-4"><span className="text-green-600 font-semibold">$40</span></td>
                  <td className="text-center p-4 text-muted-foreground">Free (but costly errors)</td>
                  <td className="text-center p-4 text-muted-foreground">$200+ per user</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-4 font-medium">Complexity</td>
                  <td className="text-center p-4"><span className="text-green-600 font-semibold">Simple</span></td>
                  <td className="text-center p-4 text-muted-foreground">Error-prone</td>
                  <td className="text-center p-4 text-muted-foreground">Overwhelming</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="p-4 font-medium">Perfect For</td>
                  <td className="text-center p-4"><span className="text-blue-600 font-semibold">Small wholesale businesses</span></td>
                  <td className="text-center p-4 text-muted-foreground">Hobbyists</td>
                  <td className="text-center p-4 text-muted-foreground">Large enterprises</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Trust Indicators Section */}
      <section className="container mx-auto px-4 py-12 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold">Australian-Based</h3>
              <p className="text-sm text-muted-foreground">Hosted in Australia with local support and data sovereignty</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold">Bank-Level Security</h3>
              <p className="text-sm text-muted-foreground">256-bit encryption, secure backups, and SOC 2 compliant infrastructure</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold">99.9% Uptime</h3>
              <p className="text-sm text-muted-foreground">Reliable infrastructure with automatic backups and disaster recovery</p>
            </div>
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

      {/* Contact Form Section */}
      <section id="contact" className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Get In Touch</h2>
            <p className="text-xl text-muted-foreground">Have questions? Want to request access? We'd love to hear from you.</p>
          </div>

          {submitSuccess ? (
            <Card className="text-center p-8">
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold">Thank You!</h3>
                <p className="text-muted-foreground">We've received your message and will get back to you within 24 hours.</p>
                <Button onClick={() => setSubmitSuccess(false)} variant="outline">
                  Send Another Message
                </Button>
              </div>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  setIsSubmitting(true);
                  submitMutation.mutate(contactForm);
                }} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        required
                        disabled={isSubmitting}
                        placeholder="John Smith"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        required
                        disabled={isSubmitting}
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={contactForm.company}
                      onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                      disabled={isSubmitting}
                      placeholder="Your Company Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      required
                      disabled={isSubmitting}
                      placeholder="Tell us about your business and how TradeFlow can help..."
                      rows={6}
                    />
                  </div>
                  <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
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
