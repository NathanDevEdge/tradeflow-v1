import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

export default function TrialExpired() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-4">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Your trial has ended</h1>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Your 7-day free trial is up. Upgrade to a paid plan to keep your quotes, pricelists, and everything you've set up — and choose the seat count that fits your team.
          </p>
        </div>

        <Button size="lg" className="w-full" onClick={() => setLocation("/subscribe?upgrade=1")}>
          Choose a plan & upgrade →
        </Button>

        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground text-left space-y-1.5">
          <p className="font-medium text-foreground">Pricing</p>
          <p>$40/month · 1 seat included</p>
          <p>+4 seat pack: $15/month &nbsp;·&nbsp; +9 seat pack: $30/month</p>
          <p>+individual seats: $5/month each</p>
          <p className="pt-1">Annual plans available — save 17%.</p>
        </div>

        <button
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => { window.location.href = "/login"; }}
        >
          Log out
        </button>
      </div>
    </div>
  );
}
