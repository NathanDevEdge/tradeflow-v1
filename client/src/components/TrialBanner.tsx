import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function TrialBanner() {
  const { data: billing } = trpc.billing.getStatus.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
  const [, setLocation] = useLocation();

  if (!billing?.isTrialing) return null;

  const days = billing.daysLeft ?? 0;
  const isUrgent = days <= 2;

  return (
    <div
      className="flex items-center justify-between gap-4 px-4 py-2 text-sm shrink-0"
      style={{
        background: isUrgent ? "oklch(0.35 0.08 30)" : "oklch(0.25 0.05 185)",
        color: "oklch(0.92 0.02 185)",
      }}
    >
      <p>
        <span
          className="font-semibold"
          style={{ color: isUrgent ? "oklch(0.85 0.12 50)" : "oklch(0.75 0.12 185)" }}
        >
          {days === 0 ? "Trial expires today" : `${days} day${days === 1 ? "" : "s"} left in your trial`}
        </span>
        {" — upgrade to keep access."}
      </p>
      <Button
        size="sm"
        variant="secondary"
        className="h-7 text-xs shrink-0"
        onClick={() => setLocation("/subscribe?upgrade=1")}
      >
        View plans & upgrade →
      </Button>
    </div>
  );
}
