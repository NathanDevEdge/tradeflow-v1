import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import { Trash2, Mail, Building2, User, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ContactInbox() {
  const { data: inquiries, isLoading, refetch } = trpc.contact.list.useQuery();
  const updateStatusMutation = trpc.contact.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update status");
    },
  });

  const deleteMutation = trpc.contact.delete.useMutation({
    onSuccess: () => {
      toast.success("Inquiry deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete inquiry");
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-primary/10 text-primary";
      case "contacted":
        return "bg-amber-100 text-amber-800";
      case "converted":
        return "bg-primary/15 text-primary";
      case "archived":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" role="status" aria-label="Loading…" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
    <div className="space-y-4 max-w-4xl">
      <div className="pb-4 border-b">
        <h1 className="text-base font-semibold">Contact Inbox</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Inquiries from the landing page contact form
        </p>
      </div>

      {!inquiries || inquiries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No inquiries yet</p>
            <p className="text-sm text-muted-foreground">
              Contact form submissions will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {inquiries.map((inquiry) => (
            <Card key={inquiry.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {inquiry.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {inquiry.email}
                      </span>
                      {inquiry.company && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {inquiry.company}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(inquiry.createdAt), "MMM d, yyyy h:mm a")}
                      </span>
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(inquiry.status)}>
                    {inquiry.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Message:</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {inquiry.message}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={inquiry.status}
                    onValueChange={(value) => {
                      updateStatusMutation.mutate({
                        id: inquiry.id,
                        status: value as "new" | "contacted" | "converted" | "archived",
                      });
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Change status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.location.href = `mailto:${inquiry.email}?subject=Re: Your TradeFlow Inquiry`;
                    }}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Reply via Email
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this inquiry?")) {
                        deleteMutation.mutate({ id: inquiry.id });
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
