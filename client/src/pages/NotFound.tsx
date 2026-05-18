import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-6">
      <div className="text-center space-y-6 max-w-sm">
        <p className="text-7xl font-bold text-primary/20 select-none">404</p>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">Page not found</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <Button onClick={() => setLocation("/")}>
          <Home className="w-4 h-4 mr-2" />
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}
