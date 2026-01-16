import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, Calendar, Clock, Mail, Trash2, RefreshCw } from "lucide-react";
import { format } from "date-fns";

export default function AdminPanel() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [subscriptionType, setSubscriptionType] = useState<"monthly" | "annual" | "indefinite">("monthly");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [extendUserId, setExtendUserId] = useState<number | null>(null);
  const [extendDays, setExtendDays] = useState("");

  const { data: users, refetch: refetchUsers } = trpc.admin.getAllUsers.useQuery();
  const { data: pendingInvitations } = trpc.admin.getPendingInvitations.useQuery();

  const inviteUserMutation = trpc.admin.inviteUser.useMutation({
    onSuccess: (data) => {
      toast.success(`Invitation sent! Share this link: ${window.location.origin}${data.inviteUrl}`);
      setInviteEmail("");
      setIsInviteDialogOpen(false);
      refetchUsers();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const extendSubscriptionMutation = trpc.admin.extendSubscription.useMutation({
    onSuccess: () => {
      toast.success("Subscription extended successfully");
      setExtendUserId(null);
      setExtendDays("");
      refetchUsers();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateSubscriptionMutation = trpc.admin.updateSubscription.useMutation({
    onSuccess: () => {
      toast.success("Subscription updated successfully");
      refetchUsers();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteUserMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("User deleted successfully");
      refetchUsers();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleInviteUser = () => {
    if (!inviteEmail) {
      toast.error("Please enter an email address");
      return;
    }
    inviteUserMutation.mutate({ email: inviteEmail, subscriptionType });
  };

  const handleExtendSubscription = (userId: number) => {
    const days = parseInt(extendDays);
    if (isNaN(days) || days < 1) {
      toast.error("Please enter a valid number of days");
      return;
    }
    extendSubscriptionMutation.mutate({ userId, days });
  };

  const handleCancelSubscription = (userId: number) => {
    if (confirm("Are you sure you want to cancel this subscription?")) {
      updateSubscriptionMutation.mutate({
        userId,
        subscriptionType: "monthly",
        subscriptionStatus: "cancelled",
      });
    }
  };

  const handleDeleteUser = (userId: number, email: string) => {
    if (confirm(`Are you sure you want to delete user ${email}? This action cannot be undone.`)) {
      deleteUserMutation.mutate({ userId });
    }
  };

  const getSubscriptionBadge = (status: string | null, daysRemaining: number | null) => {
    if (!status) return <Badge variant="secondary">No Subscription</Badge>;
    
    if (status === "cancelled") {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    
    if (status === "expired") {
      return <Badge variant="destructive">Expired</Badge>;
    }
    
    if (daysRemaining === null) {
      return <Badge className="bg-purple-500">Indefinite</Badge>;
    }
    
    if (daysRemaining < 7) {
      return <Badge variant="destructive">Expires in {daysRemaining} days</Badge>;
    }
    
    if (daysRemaining < 30) {
      return <Badge className="bg-orange-500">Expires in {daysRemaining} days</Badge>;
    }
    
    return <Badge className="bg-green-500">Active ({daysRemaining} days)</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">Manage users and subscriptions</p>
          </div>
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New User</DialogTitle>
                <DialogDescription>
                  Send an invitation to create an account with a subscription
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subscription">Subscription Type</Label>
                  <Select
                    value={subscriptionType}
                    onValueChange={(value: any) => setSubscriptionType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="indefinite">Indefinite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleInviteUser} disabled={inviteUserMutation.isPending}>
                  {inviteUserMutation.isPending ? "Sending..." : "Send Invitation"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Users</CardDescription>
              <CardTitle className="text-3xl">{users?.length || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Subscriptions</CardDescription>
              <CardTitle className="text-3xl">
                {users?.filter(u => u.subscriptionStatus === "active").length || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Invitations</CardDescription>
              <CardTitle className="text-3xl">{pendingInvitations?.length || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Expiring Soon</CardDescription>
              <CardTitle className="text-3xl">
                {users?.filter(u => u.daysRemaining !== null && u.daysRemaining < 7).length || 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>View and manage all user accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Renewal Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.subscriptionType ? (
                        <span className="capitalize">{user.subscriptionType}</span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {getSubscriptionBadge(user.subscriptionStatus, user.daysRemaining)}
                    </TableCell>
                    <TableCell>
                      {user.subscriptionEndDate ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(user.subscriptionEndDate), "MMM dd, yyyy")}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Never
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {user.role !== "admin" && (
                          <>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setExtendUserId(user.id)}
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Extend Subscription</DialogTitle>
                                  <DialogDescription>
                                    Add days to {user.email}'s subscription
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="days">Number of Days</Label>
                                    <Input
                                      id="days"
                                      type="number"
                                      min="1"
                                      placeholder="30"
                                      value={extendDays}
                                      onChange={(e) => setExtendDays(e.target.value)}
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button
                                    onClick={() => handleExtendSubscription(user.id)}
                                    disabled={extendSubscriptionMutation.isPending}
                                  >
                                    Extend
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id, user.email)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        {pendingInvitations && pendingInvitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>Users who haven't completed registration yet</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Subscription Type</TableHead>
                    <TableHead>Invited</TableHead>
                    <TableHead>Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvitations.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {invite.email}
                      </TableCell>
                      <TableCell className="capitalize">{invite.subscriptionType}</TableCell>
                      <TableCell>{format(new Date(invite.createdAt), "MMM dd, yyyy")}</TableCell>
                      <TableCell>{format(new Date(invite.expiresAt), "MMM dd, yyyy")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
