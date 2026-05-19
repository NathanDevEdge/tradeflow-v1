import React, { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, Loader2, ArrowLeft, Users } from "lucide-react";

type Plan = "monthly" | "annual";
type Flow = "trial" | "pay";
type SeatOption = "none" | "pack4" | "pack9" | "custom";

const BASE_PRICE = { monthly: 40, annual: 399 };
const SEAT_PACK_PRICE = { pack4: { monthly: 15, annual: 150 }, pack9: { monthly: 30, annual: 300 } };

function seatAddOnPrice(opt: SeatOption, customCount: number, plan: Plan): number {
  if (opt === "pack4") return SEAT_PACK_PRICE.pack4[plan];
  if (opt === "pack9") return SEAT_PACK_PRICE.pack9[plan];
  if (opt === "custom") return customCount * (plan === "annual" ? 50 : 5);
  return 0;
}

function totalSeatCount(opt: SeatOption, customCount: number): number {
  if (opt === "none") return 1;
  if (opt === "pack4") return 5;
  if (opt === "pack9") return 10;
  return 1 + customCount;
}

function buildSeatOption(opt: SeatOption, customCount: number) {
  if (opt === "pack4") return { type: "pack4" as const };
  if (opt === "pack9") return { type: "pack9" as const };
  if (opt === "custom") return { type: "custom" as const, extra: customCount };
  return { type: "none" as const };
}

export default function Subscribe() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const isUpgrade = new URLSearchParams(search).get("upgrade") === "1";
  const [flow, setFlow] = useState<Flow>(isUpgrade ? "pay" : "trial");

  // If coming from upgrade link, auto-select pay flow
  useEffect(() => {
    if (isUpgrade) setFlow("pay");
  }, [isUpgrade]);
  const [plan, setPlan] = useState<Plan>("monthly");
  const [seatOption, setSeatOption] = useState<SeatOption>("none");
  const [customSeats, setCustomSeats] = useState(1);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const startTrial = trpc.billing.startTrial.useMutation({
    onSuccess: () => setLocation("/trial-started"),
    onError: (err) => { toast.error(err.message); setIsLoading(false); },
  });

  const createCheckout = trpc.billing.createCheckoutSession.useMutation({
    onSuccess: (data) => { window.location.href = data.url; },
    onError: (err) => { toast.error(err.message); setIsLoading(false); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !company) { toast.error("Please fill in all required fields"); return; }

    if (flow === "trial") {
      if (!password) { toast.error("Please set a password"); return; }
      if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
      if (password !== confirmPassword) { toast.error("Passwords do not match"); return; }
      setIsLoading(true);
      startTrial.mutate({ ownerName: name, email, companyName: company, password });
    } else {
      setIsLoading(true);
      createCheckout.mutate({
        plan,
        email,
        companyName: company,
        ownerName: name,
        seatOption: buildSeatOption(seatOption, customSeats),
      });
    }
  };

  const addOnCost = seatAddOnPrice(seatOption, customSeats, plan);
  const totalCost = BASE_PRICE[plan] + addOnCost;
  const seats = totalSeatCount(seatOption, customSeats);

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-col justify-between p-12 shrink-0"
        style={{ background: "var(--sidebar)" }}
      >
        <div>
          <button
            className="flex items-center gap-2 text-sm mb-8"
            style={{ color: "oklch(0.75 0.04 185)" }}
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <a href="/"><img src="/logo.svg" alt="TradeFlow" className="h-7 object-contain" style={{ filter: "brightness(0) invert(1)" }} /></a>
        </div>

        <div className="space-y-8">
          <p className="text-3xl font-bold leading-tight tracking-tight" style={{ color: "var(--sidebar-foreground)" }}>
            {flow === "trial" ? "Try free\nfor 7 days." : "Start quoting\ntoday."}
          </p>

          <ul className="space-y-3">
            {[
              { label: "Unlimited quotes & purchase orders" },
              { label: "Live margin tracking" },
              { label: "PDF generation — margins hidden from customers" },
              { label: "One-click PO emails" },
              { label: "Australian hosted & supported" },
            ].map(({ label }) => (
              <li key={label} className="flex items-center gap-2.5 text-sm" style={{ color: "oklch(0.85 0.04 185)" }}>
                <Check className="h-4 w-4 shrink-0" style={{ color: "oklch(0.65 0.12 185)" }} />
                {label}
              </li>
            ))}
          </ul>

          {flow === "trial" && (
            <div className="rounded-lg p-4 text-sm space-y-1" style={{ background: "oklch(1 0 0 / 0.06)", color: "oklch(0.8 0.04 185)" }}>
              <p className="font-semibold" style={{ color: "var(--sidebar-foreground)" }}>3 seats included in your trial</p>
              <p>Invite your team to try it out. At the end of the trial, choose a seat plan that fits.</p>
            </div>
          )}
        </div>

        <p className="text-xs" style={{ color: "oklch(0.55 0.04 185)" }}>
          © {new Date().getFullYear()} TradeFlow
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-start justify-center p-6 bg-background overflow-y-auto">
        <div className="w-full max-w-sm space-y-6 py-8">
          {/* Mobile back + logo */}
          <div className="lg:hidden flex items-center gap-3">
            <button onClick={() => setLocation("/")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <a href="/"><img src="/logo.svg" alt="TradeFlow" className="h-6 object-contain" /></a>
          </div>

          {/* Flow toggle */}
          <div className="flex rounded-lg border border-border p-1 gap-1">
            <button
              type="button"
              onClick={() => setFlow("trial")}
              className={`flex-1 text-sm py-2 rounded-md font-medium transition-colors ${flow === "trial" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              7-day Free Trial
            </button>
            <button
              type="button"
              onClick={() => setFlow("pay")}
              className={`flex-1 text-sm py-2 rounded-md font-medium transition-colors ${flow === "pay" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Pay Now
            </button>
          </div>

          {flow === "trial" ? (
            <p className="text-xs text-muted-foreground text-center">
              No credit card required · 3 seats · 7 days free
            </p>
          ) : (
            <div className="space-y-4">
              {/* Plan selector */}
              <div className="flex gap-3">
                {(["monthly", "annual"] as Plan[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlan(p)}
                    className={`flex-1 rounded-lg border p-3 text-left transition-colors ${plan === p ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                  >
                    <p className="text-sm font-semibold">{p === "monthly" ? "$40/mo" : "$399/yr"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{p === "monthly" ? "Billed monthly" : "Save 17% · $33.25/mo"}</p>
                  </button>
                ))}
              </div>

              {/* Seat selector */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Seats
                </Label>
                <div className="space-y-2">
                  {([
                    { value: "none", label: "1 seat", sublabel: "Included", price: null },
                    { value: "pack4", label: "5 seats", sublabel: `+4 seat pack`, price: SEAT_PACK_PRICE.pack4[plan] },
                    { value: "pack9", label: "10 seats", sublabel: `+9 seat pack`, price: SEAT_PACK_PRICE.pack9[plan] },
                    { value: "custom", label: "Custom", sublabel: `$5/seat/mo · $50/seat/yr`, price: null },
                  ] as const).map(({ value, label, sublabel, price }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSeatOption(value)}
                      className={`w-full flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors ${seatOption === value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                    >
                      <div>
                        <span className="text-sm font-medium">{label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{sublabel}</span>
                      </div>
                      {price !== null ? (
                        <span className="text-sm font-semibold text-primary">
                          +${price}/{plan === "annual" ? "yr" : "mo"}
                        </span>
                      ) : value === "none" ? (
                        <span className="text-xs text-muted-foreground">included</span>
                      ) : null}
                    </button>
                  ))}

                  {seatOption === "custom" && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
                      <span className="text-sm text-muted-foreground flex-1">Extra seats beyond 1 included:</span>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setCustomSeats(Math.max(1, customSeats - 1))} className="h-6 w-6 rounded border border-border text-sm hover:bg-muted">−</button>
                        <span className="w-6 text-center text-sm font-medium">{customSeats}</span>
                        <button type="button" onClick={() => setCustomSeats(Math.min(50, customSeats + 1))} className="h-6 w-6 rounded border border-border text-sm hover:bg-muted">+</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Price summary */}
              <div className="rounded-lg bg-muted/40 px-3 py-2.5 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{seats} seat{seats !== 1 ? "s" : ""} · {plan}</span>
                <span className="font-semibold">
                  ${totalCost}/{plan === "annual" ? "yr" : "mo"}
                </span>
              </div>
            </div>
          )}

          {/* Form fields */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Your name *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" required disabled={isLoading} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email *</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@yourcompany.com" required disabled={isLoading} autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company">Company name *</Label>
              <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Your Company Pty Ltd" required disabled={isLoading} />
            </div>

            {flow === "trial" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password *</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" required disabled={isLoading} autoComplete="new-password" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm password *</Label>
                  <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" required disabled={isLoading} autoComplete="new-password" />
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={isLoading} size="lg">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {flow === "trial"
                ? "Start free trial"
                : `Pay $${totalCost}/${plan === "annual" ? "year" : "month"} →`}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            Already have an account?{" "}
            <button className="text-primary hover:text-primary/80 transition-colors" onClick={() => setLocation("/login")}>
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
