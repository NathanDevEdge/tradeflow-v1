import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loginMutation = trpc.customAuth.login.useMutation({
    onSuccess: (data) => {
      toast.success("Login successful");
      window.location.href = data.user.role === "super_admin" ? "/admin" : "/dashboard";
    },
    onError: (error) => {
      toast.error(error.message);
      setIsLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — dark teal brand */}
      <div
        className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-col justify-between p-12 shrink-0"
        style={{ background: "var(--sidebar)" }}
      >
        <div>
          <img src="/logo.svg" alt="TradeFlow" className="h-8 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
        </div>

        <div className="space-y-4">
          <p
            className="text-3xl font-bold leading-tight tracking-tight"
            style={{ color: "var(--sidebar-foreground)" }}
          >
            Better than Spreadsheets,<br />
            Cheaper than the rest.
          </p>
          <p className="text-sm" style={{ color: "oklch(0.75 0.04 185)" }}>
            Quotes, purchase orders, and supplier management — built for small businesses that mean business.
          </p>
        </div>

        <p className="text-xs" style={{ color: "oklch(0.55 0.04 185)" }}>
          © {new Date().getFullYear()} TradeFlow
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden">
            <img src="/logo.svg" alt="TradeFlow" className="h-7 object-contain" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Sign in</h1>
            <p className="text-sm text-muted-foreground">Enter your email and password to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                  onClick={() => setLocation("/forgot-password")}
                  disabled={isLoading}
                >
                  Forgot password?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              Sign in
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            No account?{" "}
            <span className="text-primary">Contact your TradeFlow administrator.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
