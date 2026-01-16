import { useEffect } from "react";
import { getLoginUrl } from "@/const";

export default function AdminLogin() {
  useEffect(() => {
    // Immediately redirect to OAuth login
    window.location.href = getLoginUrl();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Redirecting to admin login...</p>
      </div>
    </div>
  );
}
