import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export default function TrialStarted() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Check className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Your trial has started!</h1>
          <p className="text-muted-foreground">
            Check your email for your login link. You have 7 days to explore TradeFlow — no credit card needed.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-left space-y-2">
          <p className="font-medium">What to do next:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>1. Check your email for login details</li>
            <li>2. Upload your first supplier pricelist</li>
            <li>3. Add a customer and create your first quote</li>
          </ul>
        </div>
        <Button className="w-full" onClick={() => setLocation("/login")}>
          Go to login
        </Button>
      </div>
    </div>
  );
}
