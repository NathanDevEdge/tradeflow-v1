import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Shield } from "lucide-react";

export default function SupportPage() {
  const { data, isLoading } = trpc.support.getCode.useQuery();

  return (
    <DashboardLayout>
      <div className="max-w-lg space-y-6">
        <div className="pb-4 border-b">
          <h1 className="text-base font-semibold">Support Access</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Share your support code to let us access your account
          </p>
        </div>

        <div className="rounded-lg border p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Your support code</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                If you need help from the TradeFlow team, share this 6-digit code. It gives read and write access to your account for 4 hours.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="h-16 flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
            </div>
          ) : data?.code ? (
            <div className="text-center py-4">
              <p className="text-5xl font-mono font-bold tracking-[0.25em] text-foreground select-all">
                {data.code}
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                This code is unique to <strong>{data.orgName}</strong> and does not expire or change unless we regenerate it.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No support code assigned to your account. Contact support@devedge.com.au.
            </p>
          )}
        </div>

        <div className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground space-y-1.5">
          <p className="font-medium text-foreground">How it works</p>
          <p>1. You share your code with the TradeFlow support team.</p>
          <p>2. Support enters the code in their admin portal to view your account.</p>
          <p>3. They can make changes on your behalf and exit when done.</p>
          <p className="pt-1">Only authorised TradeFlow staff have access to the admin portal.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
