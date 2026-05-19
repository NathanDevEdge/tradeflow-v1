import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Check className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Payment successful!</h1>
          <p className="text-muted-foreground">
            Your account is being set up. Check your email — your login credentials will arrive within a minute.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <p>Didn't get the email? Check your spam folder or contact us at <a href="mailto:support@devedge.com.au" className="text-primary hover:underline">support@devedge.com.au</a></p>
        </div>
        <Button variant="outline" onClick={() => setLocation("/login")}>
          Go to login
        </Button>
      </div>
    </div>
  );
}
