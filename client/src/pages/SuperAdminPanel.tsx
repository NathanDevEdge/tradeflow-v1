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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Building2, UserPlus, Users, Trash2, Calendar, Settings2 } from "lucide-react";

export default function SuperAdminPanel() {
  const [isCreateOrgDialogOpen, setIsCreateOrgDialogOpen] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgSubscriptionType, setOrgSubscriptionType] = useState<"monthly" | "annual" | "indefinite">("monthly");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"user" | "org_owner">("user");

  const { data: organizations, refetch: refetchOrgs } = trpc.organizations.list.useQuery();
  const { data: allUsers, refetch: refetchUsers } = trpc.users.list.useQuery();

  const createOrgMutation = trpc.organizations.create.useMutation({
    onSuccess: () => {
      toast.success("Organization created successfully");
      setOrgName("");
      setOrgSubscriptionType("monthly");
      setIsCreateOrgDialogOpen(false);
      refetchOrgs();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createUserMutation = trpc.users.create.useMutation({
    onSuccess: (data) => {
      toast.success(`User created! Registration link: ${window.location.origin}/register?email=${encodeURIComponent(data.email)}`);
      setInviteEmail("");
      setInviteName("");
      setIsInviteDialogOpen(false);
      refetchUsers();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateUserOrgMutation = trpc.users.updateOrganization.useMutation({
    onSuccess: () => {
      toast.success("User organization updated");
      refetchUsers();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteUserMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("User deleted successfully");
      refetchUsers();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [extendOrgId, setExtendOrgId] = useState<number | null>(null);
  const [extendDays, setExtendDays] = useState("30");
  const [editSubOrgId, setEditSubOrgId] = useState<number | null>(null);
  const [editSubType, setEditSubType] = useState<"monthly" | "annual" | "indefinite">("monthly");
  const [editUserLimitOrgId, setEditUserLimitOrgId] = useState<number | null>(null);
  const [editUserLimit, setEditUserLimit] = useState("5");

  const extendSubMutation = trpc.organizations.extendSubscription.useMutation({
    onSuccess: () => {
      toast.success("Subscription extended successfully");
      setExtendOrgId(null);
      setExtendDays("30");
      refetchOrgs();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateSubMutation = trpc.organizations.updateSubscription.useMutation({
    onSuccess: () => {
      toast.success("Subscription type updated successfully");
      setEditSubOrgId(null);
      refetchOrgs();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateUserLimitMutation = trpc.organizations.updateUserLimit.useMutation({
    onSuccess: () => {
      toast.success("User limit updated successfully");
      setEditUserLimitOrgId(null);
      refetchOrgs();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreateOrg = () => {
    if (!orgName.trim()) {
      toast.error("Please enter an organization name");
      return;
    }
    createOrgMutation.mutate({ name: orgName, subscriptionType: orgSubscriptionType });
  };

  const handleInviteUser = () => {
    if (!inviteEmail.trim() || !inviteName.trim() || !selectedOrgId) {
      toast.error("Please fill in all fields");
      return;
    }
    createUserMutation.mutate({
      email: inviteEmail,
      name: inviteName,
      role: inviteRole,
      organizationId: selectedOrgId,
    });
  };

  const handleChangeUserOrg = (userId: number, newOrgId: number) => {
    if (confirm("Are you sure you want to change this user's organization?")) {
      updateUserOrgMutation.mutate({ userId, organizationId: newOrgId });
    }
  };

  const handleDeleteUser = (userId: number, email: string) => {
    if (confirm(`Are you sure you want to delete user ${email}? This action cannot be undone.`)) {
      deleteUserMutation.mutate({ userId });
    }
  };

  const getOrgName = (orgId: number | null) => {
    if (!orgId) return "No Organization";
    const org = organizations?.find(o => o.id === orgId);
    return org?.name || "Unknown";
  };

  const calculateDaysRemaining = (endDate: Date | null, subType: string | null) => {
    if (subType === "indefinite") return "∞";
    if (!endDate) return "N/A";
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? `${diffDays} days` : "Expired";
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Super Admin Panel</h1>
          <p className="text-muted-foreground">Manage organizations and users across the entire system</p>
        </div>

        <Tabs defaultValue="organizations" className="space-y-6">
          <TabsList>
            <TabsTrigger value="organizations">
              <Building2 className="mr-2 h-4 w-4" />
              Organizations
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="mr-2 h-4 w-4" />
              All Users
            </TabsTrigger>
          </TabsList>

          {/* Organizations Tab */}
          <TabsContent value="organizations" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold">Organizations</h2>
                <p className="text-muted-foreground">Create and manage organizations</p>
              </div>
              <Dialog open={isCreateOrgDialogOpen} onOpenChange={setIsCreateOrgDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Building2 className="mr-2 h-4 w-4" />
                    Create Organization
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Organization</DialogTitle>
                    <DialogDescription>
                      Create a new organization to group users and their data
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="orgName">Organization Name</Label>
                      <Input
                        id="orgName"
                        placeholder="Acme Hardware Store"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subscriptionType">Subscription Type</Label>
                      <Select
                        value={orgSubscriptionType}
                        onValueChange={(value: any) => setOrgSubscriptionType(value)}
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
                    <Button onClick={handleCreateOrg} disabled={createOrgMutation.isPending}>
                      {createOrgMutation.isPending ? "Creating..." : "Create Organization"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>All Organizations</CardTitle>
                <CardDescription>View all organizations in the system</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Subscription</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations?.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell className="font-mono">{org.id}</TableCell>
                        <TableCell className="font-medium">{org.name}</TableCell>
                        <TableCell>
                          <span className="capitalize">{org.subscriptionType || "monthly"}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{calculateDaysRemaining(org.subscriptionEndDate, org.subscriptionType)}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={org.subscriptionStatus === "active" ? "default" : "destructive"}>
                            {org.subscriptionStatus || "active"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {allUsers?.filter(u => u.organizationId === org.id).length || 0} / {org.userLimit || 5}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Dialog open={extendOrgId === org.id} onOpenChange={(open) => !open && setExtendOrgId(null)}>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => setExtendOrgId(org.id)}>
                                  <Calendar className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Extend Subscription</DialogTitle>
                                  <DialogDescription>Add days to {org.name}'s subscription</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="days">Days to Add</Label>
                                    <Input
                                      id="days"
                                      type="number"
                                      min="1"
                                      value={extendDays}
                                      onChange={(e) => setExtendDays(e.target.value)}
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button onClick={() => extendSubMutation.mutate({ organizationId: org.id, days: parseInt(extendDays) })} disabled={extendSubMutation.isPending}>
                                    {extendSubMutation.isPending ? "Extending..." : "Extend"}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Dialog open={editSubOrgId === org.id} onOpenChange={(open) => !open && setEditSubOrgId(null)}>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => { setEditSubOrgId(org.id); setEditSubType(org.subscriptionType || "monthly"); }}>
                                  <Settings2 className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Manage Subscription</DialogTitle>
                                  <DialogDescription>Update subscription settings for {org.name}</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="subType">Subscription Type</Label>
                                    <Select value={editSubType} onValueChange={(value: any) => setEditSubType(value)}>
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
                                  <div className="space-y-2">
                                    <Label htmlFor="userLimit">User Limit</Label>
                                    <Input
                                      id="userLimit"
                                      type="number"
                                      min="1"
                                      value={editUserLimitOrgId === org.id ? editUserLimit : org.userLimit?.toString() || "5"}
                                      onChange={(e) => { setEditUserLimitOrgId(org.id); setEditUserLimit(e.target.value); }}
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button onClick={() => {
                                    updateSubMutation.mutate({ organizationId: org.id, subscriptionType: editSubType });
                                    if (editUserLimitOrgId === org.id) {
                                      updateUserLimitMutation.mutate({ organizationId: org.id, userLimit: parseInt(editUserLimit) });
                                    }
                                  }} disabled={updateSubMutation.isPending || updateUserLimitMutation.isPending}>
                                    {(updateSubMutation.isPending || updateUserLimitMutation.isPending) ? "Saving..." : "Save Changes"}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold">All Users</h2>
                <p className="text-muted-foreground">Manage users across all organizations</p>
              </div>
              <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription>
                      Create a user and assign them to an organization
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
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        placeholder="John Smith"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="organization">Organization</Label>
                      <Select
                        value={selectedOrgId?.toString() || ""}
                        onValueChange={(value) => setSelectedOrgId(parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select organization" />
                        </SelectTrigger>
                        <SelectContent>
                          {organizations?.map((org) => (
                            <SelectItem key={org.id} value={org.id.toString()}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={inviteRole}
                        onValueChange={(value: any) => setInviteRole(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="org_owner">Organization Owner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleInviteUser} disabled={createUserMutation.isPending}>
                      {createUserMutation.isPending ? "Creating..." : "Create User"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View and manage all users in the system</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{user.name || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === "super_admin" ? "default" : user.role === "org_owner" ? "secondary" : "outline"}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.organizationId?.toString() || ""}
                            onValueChange={(value) => handleChangeUserOrg(user.id, parseInt(value))}
                            disabled={user.role === "super_admin"}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue>{getOrgName(user.organizationId)}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {organizations?.map((org) => (
                                <SelectItem key={org.id} value={org.id.toString()}>
                                  {org.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.status === "active" ? "default" : "secondary"}>
                            {user.status || "pending"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.role !== "super_admin" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id, user.email)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
