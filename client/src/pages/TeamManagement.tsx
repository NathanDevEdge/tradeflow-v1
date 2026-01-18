import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, KeyRound } from "lucide-react";

export default function TeamManagement() {
  const { data: teamMembers, isLoading } = trpc.organizationUsers.list.useQuery();
  const utils = trpc.useUtils();
  
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const resetPasswordMutation = trpc.organizationUsers.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Password reset successfully");
      setNewPassword("");
      setConfirmPassword("");
      setDialogOpen(false);
      utils.organizationUsers.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleResetPassword = () => {
    if (!selectedUserId) return;
    
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    resetPasswordMutation.mutate({
      userId: selectedUserId,
      newPassword,
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container py-8">
          <p className="text-muted-foreground">Loading team members...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-2">Team Management</h1>
        <p className="text-muted-foreground mb-8">
          Manage your organization's team members and their access
        </p>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members
            </CardTitle>
            <CardDescription>
              View and manage passwords for your team members
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!teamMembers || teamMembers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No team members found
              </p>
            ) : (
              <div className="space-y-4">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{member.name || "Unnamed User"}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                      <p className="text-xs text-muted-foreground capitalize mt-1">
                        Role: {member.role?.replace("_", " ")}
                      </p>
                    </div>
                    <Dialog
                      open={dialogOpen && selectedUserId === member.id}
                      onOpenChange={(open) => {
                        setDialogOpen(open);
                        if (open) {
                          setSelectedUserId(member.id);
                          setNewPassword("");
                          setConfirmPassword("");
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <KeyRound className="h-4 w-4 mr-2" />
                          Reset Password
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reset Password</DialogTitle>
                          <DialogDescription>
                            Set a new password for {member.name || member.email}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                              id="newPassword"
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Enter new password (min 8 characters)"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input
                              id="confirmPassword"
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Confirm new password"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleResetPassword}
                              disabled={resetPasswordMutation.isPending}
                            >
                              {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
