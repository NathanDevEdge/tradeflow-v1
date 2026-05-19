import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Register() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) setInvitationToken(token);
  }, []);

  const registerMutation = trpc.customAuth.register.useMutation({
    onSuccess: () => {
      toast.success("Account created — please sign in.");
      setLocation("/login");
    },
    onError: (error) => {
      toast.error(error.message);
      setIsLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setIsLoading(true);
    registerMutation.mutate({ email, password, name, invitationToken: invitationToken || undefined });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — dark teal brand */}
      <div
        className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-col justify-between p-12 shrink-0"
        style={{ background: "var(--sidebar)" }}
      >
        <div>
          <a href="/"><img src="/logo.svg" alt="TradeFlow" className="h-8 object-contain" style={{ filter: "brightness(0) invert(1)" }} /></a>
        </div>
        <div className="space-y-4">
          <p
            className="text-3xl font-bold leading-tight tracking-tight"
            style={{ color: "var(--sidebar-foreground)" }}
          >
            You've been invited<br />to TradeFlow.
          </p>
          <p className="text-sm" style={{ color: "oklch(0.75 0.04 185)" }}>
            Create your account to start managing quotes, purchase orders, and more — all in one place.
          </p>
        </div>
        <p className="text-xs" style={{ color: "oklch(0.55 0.04 185)" }}>
          © {new Date().getFullYear()} TradeFlow
        </p>
      </div>

      {/* Right panel — registration form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden">
            <a href="/"><img src="/logo.svg" alt="TradeFlow" className="h-7 object-contain" /></a>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Create your account</h1>
            <p className="text-sm text-muted-foreground">Fill in your details to get started</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium">Full name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                autoComplete="name"
              />
            </div>

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
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" className="w-full mt-2" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              Create account
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            Already have an account?{" "}
            <button
              type="button"
              className="text-primary hover:text-primary/80 transition-colors"
              onClick={() => setLocation("/login")}
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
