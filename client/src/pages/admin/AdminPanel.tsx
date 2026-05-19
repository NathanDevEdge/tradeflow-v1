import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, Users, BarChart3, Shield, Calendar, Settings2, LogIn, Ban, CheckCircle, RotateCcw } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type OrgStatus = "active" | "expired" | "cancelled" | "trial";
type SubType = "monthly" | "annual" | "indefinite";

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------
function StatusBadge({ status, suspended }: { status: string; suspended?: number }) {
  if (suspended) return <Badge className="bg-red-600 text-white">Suspended</Badge>;
  const variants: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800",
    trial: "bg-amber-100 text-amber-800",
    expired: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${variants[status] ?? variants.cancelled}`}>
      {suspended ? "Suspended" : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function daysLeft(endDate: Date | string | null, subType: string | null) {
  if (subType === "indefinite") return "∞";
  if (!endDate) return "—";
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
  return diff > 0 ? `${diff}d` : "Expired";
}

// ---------------------------------------------------------------------------
// Stats overview
// ---------------------------------------------------------------------------
function StatsRow() {
  const { data: stats } = trpc.organizations.stats.useQuery(undefined, { staleTime: 30_000 });
  const items = [
    { label: "Total orgs", value: stats?.totalOrgs ?? "—", color: "text-foreground" },
    { label: "Active (paid)", value: stats?.active ?? "—", color: "text-emerald-600" },
    { label: "Trialing", value: stats?.trialing ?? "—", color: "text-amber-600" },
    { label: "Expired", value: stats?.expired ?? "—", color: "text-red-500" },
    { label: "Suspended", value: stats?.suspended ?? "—", color: "text-gray-500" },
    { label: "Total users", value: stats?.totalUsers ?? "—", color: "text-foreground" },
  ];
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {items.map((s) => (
        <Card key={s.label} className="py-3">
          <CardContent className="p-0 px-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Impersonation panel
// ---------------------------------------------------------------------------
function ImpersonationPanel() {
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<{ orgName: string; ownerEmail: string } | null>(null);
  const startImp = trpc.superAdmin.startImpersonation.useMutation({
    onSuccess: (data) => {
      setPreview(data);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleEnter = () => {
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      toast.error("Support code must be exactly 6 digits");
      return;
    }
    if (preview) {
      // Confirmed — actually navigate
      window.location.href = "/dashboard";
    } else {
      startImp.mutate({ code });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <LogIn className="h-4 w-4" />
          Impersonate via Support Code
        </CardTitle>
        <CardDescription>
          Ask the org owner to share their 6-digit support code from Settings → Support. Enter it below to view their account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {preview ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
            <p className="text-sm font-medium text-amber-900">Ready to impersonate:</p>
            <p className="text-sm text-amber-800">
              <strong>{preview.orgName}</strong> · {preview.ownerEmail}
            </p>
            <p className="text-xs text-amber-700">You will see their dashboard as if you were logged in as the org owner. An impersonation banner will appear at the top.</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => { window.location.href = "/dashboard"; }}>
                Enter as {preview.orgName} →
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setPreview(null); setCode(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2 max-w-xs">
            <Input
              placeholder="123456"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="font-mono text-lg tracking-widest"
            />
            <Button onClick={handleEnter} disabled={startImp.isPending}>
              {startImp.isPending ? "…" : "Go"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Org detail dialog
// ---------------------------------------------------------------------------
function OrgDetailDialog({ orgId, onClose }: { orgId: number; onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: org } = trpc.organizations.getWithUsers.useQuery({ organizationId: orgId }, { enabled: !!orgId });

  const [extendDays, setExtendDays] = useState("30");
  const [newStatus, setNewStatus] = useState<OrgStatus | "">("");
  const [newSubType, setNewSubType] = useState<SubType | "">("");
  const [newSeats, setNewSeats] = useState("");
  const [resetResult, setResetResult] = useState<Record<number, string>>({});

  const refetch = () => {
    utils.organizations.getWithUsers.invalidate({ organizationId: orgId });
    utils.organizations.list.invalidate();
    utils.organizations.stats.invalidate();
  };

  const extend = trpc.organizations.extendSubscription.useMutation({
    onSuccess: () => { toast.success("Days added"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateStatus = trpc.organizations.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateSubType = trpc.organizations.updateSubscription.useMutation({
    onSuccess: () => { toast.success("Plan updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateSeats = trpc.organizations.updateUserLimit.useMutation({
    onSuccess: () => { toast.success("Seats updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const setSuspended = trpc.organizations.setSuspended.useMutation({
    onSuccess: () => { toast.success("Updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const resetPw = trpc.organizations.resetUserPassword.useMutation({
    onSuccess: (data, vars) => {
      setResetResult((prev) => ({ ...prev, [vars.userId]: data.tempPassword }));
      toast.success("Password reset");
    },
    onError: (e) => toast.error(e.message),
  });

  if (!org) return null;

  const endDate = org.subscriptionEndDate ? new Date(org.subscriptionEndDate) : null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{org.name}</DialogTitle>
          <DialogDescription>
            ID #{org.id} · Created {new Date(org.createdAt).toLocaleDateString("en-AU")} · Support code: <code className="font-mono font-bold">{org.supportCode ?? "—"}</code>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Subscription status */}
          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-semibold">Subscription</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={org.subscriptionStatus ?? "trial"} suspended={org.suspended} />
              <span className="text-muted-foreground">Plan</span>
              <span className="capitalize">{org.subscriptionType ?? "—"}</span>
              <span className="text-muted-foreground">Seats</span>
              <span>{org.userLimit}</span>
              <span className="text-muted-foreground">End date</span>
              <span>{endDate ? endDate.toLocaleDateString("en-AU") : "—"}</span>
            </div>

            {/* Add days */}
            <div className="flex items-end gap-2 pt-1">
              <div className="space-y-1">
                <Label className="text-xs">Add days</Label>
                <Input type="number" min={1} value={extendDays} onChange={(e) => setExtendDays(e.target.value)} className="w-24 h-8 text-sm" />
              </div>
              <Button size="sm" variant="outline" onClick={() => extend.mutate({ organizationId: orgId, days: Number(extendDays) })} disabled={extend.isPending}>
                <Calendar className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
            </div>

            {/* Change status */}
            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Set status</Label>
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as OrgStatus)}>
                  <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Choose…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" variant="outline" disabled={!newStatus || updateStatus.isPending} onClick={() => newStatus && updateStatus.mutate({ organizationId: orgId, status: newStatus })}>
                Set
              </Button>
            </div>

            {/* Change plan type */}
            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Set plan</Label>
                <Select value={newSubType} onValueChange={(v) => setNewSubType(v as SubType)}>
                  <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Choose…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="indefinite">Indefinite (free)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" variant="outline" disabled={!newSubType || updateSubType.isPending} onClick={() => newSubType && updateSubType.mutate({ organizationId: orgId, subscriptionType: newSubType })}>
                Set
              </Button>
            </div>

            {/* Seats */}
            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Seat limit</Label>
                <Input type="number" min={1} placeholder={String(org.userLimit)} value={newSeats} onChange={(e) => setNewSeats(e.target.value)} className="w-24 h-8 text-sm" />
              </div>
              <Button size="sm" variant="outline" disabled={!newSeats || updateSeats.isPending} onClick={() => newSeats && updateSeats.mutate({ organizationId: orgId, userLimit: Number(newSeats) })}>
                Update
              </Button>
            </div>

            {/* Suspend */}
            <div className="pt-1 border-t flex gap-2">
              {org.suspended ? (
                <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => setSuspended.mutate({ organizationId: orgId, suspended: false })} disabled={setSuspended.isPending}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                  Unsuspend
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="text-red-600" onClick={() => setSuspended.mutate({ organizationId: orgId, suspended: true })} disabled={setSuspended.isPending}>
                  <Ban className="h-3.5 w-3.5 mr-1" />
                  Suspend org
                </Button>
              )}
            </div>
          </div>

          {/* Users */}
          <div className="space-y-2">
            <p className="text-sm font-semibold">Users ({org.users.length})</p>
            <div className="rounded-lg border divide-y">
              {org.users.map((u) => (
                <div key={u.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{u.name || u.email}</p>
                    <p className="text-xs text-muted-foreground">{u.email} · <span className="capitalize">{u.role}</span></p>
                    {resetResult[u.id] && (
                      <p className="text-xs text-amber-700 font-mono mt-0.5">New temp password: {resetResult[u.id]}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => resetPw.mutate({ userId: u.id })}
                    disabled={resetPw.isPending}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset pw
                  </Button>
                </div>
              ))}
              {org.users.length === 0 && (
                <p className="px-3 py-4 text-sm text-muted-foreground">No users in this org yet.</p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Create org dialog
// ---------------------------------------------------------------------------
function CreateOrgDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [subType, setSubType] = useState<SubType>("monthly");
  const [seats, setSeats] = useState("1");
  const [result, setResult] = useState<{ id: number; supportCode: string } | null>(null);

  const create = trpc.organizations.create.useMutation({
    onSuccess: (data) => {
      setResult(data);
      utils.organizations.list.invalidate();
      utils.organizations.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const reset = () => { setName(""); setOwnerEmail(""); setOwnerName(""); setOwnerPassword(""); setSubType("monthly"); setSeats("1"); setResult(null); onClose(); };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Organisation</DialogTitle>
          <DialogDescription>Set up a new org with optional owner account.</DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-1.5">
              <p className="text-sm font-semibold text-emerald-900">Organisation created!</p>
              <p className="text-sm text-emerald-800">ID: #{result.id}</p>
              <p className="text-sm text-emerald-800">Support code: <code className="font-mono font-bold">{result.supportCode}</code></p>
              {ownerPassword && <p className="text-sm text-emerald-800">Owner password: <code className="font-mono">{ownerPassword}</code></p>}
            </div>
            <Button onClick={reset}>Done</Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Organisation name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Hardware Pty Ltd" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Plan</Label>
                  <Select value={subType} onValueChange={(v) => setSubType(v as SubType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="indefinite">Indefinite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Seats</Label>
                  <Input type="number" min={1} value={seats} onChange={(e) => setSeats(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground font-medium pt-1">Owner account (optional)</p>
              <div className="space-y-1">
                <Label>Owner name</Label>
                <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Jane Smith" />
              </div>
              <div className="space-y-1">
                <Label>Owner email</Label>
                <Input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="jane@company.com" />
              </div>
              <div className="space-y-1">
                <Label>Temp password</Label>
                <Input value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} placeholder="At least 8 characters" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={reset}>Cancel</Button>
              <Button
                disabled={!name.trim() || create.isPending}
                onClick={() => create.mutate({
                  name: name.trim(),
                  subscriptionType: subType,
                  userLimit: Number(seats) || 1,
                  ownerEmail: ownerEmail || undefined,
                  ownerName: ownerName || undefined,
                  ownerPassword: ownerPassword || undefined,
                })}
              >
                {create.isPending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Organisations tab
// ---------------------------------------------------------------------------
function OrgsTab() {
  const { data: orgs, isLoading } = trpc.organizations.list.useQuery();
  const { data: allUsers } = trpc.users.list.useQuery();
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = (orgs ?? []).filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <Input placeholder="Search organisations…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Button onClick={() => setCreateOpen(true)}>
          <Building2 className="h-4 w-4 mr-1.5" />
          New org
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="px-3 py-2.5 font-medium text-muted-foreground">Organisation</th>
              <th className="px-3 py-2.5 font-medium text-muted-foreground">Status</th>
              <th className="px-3 py-2.5 font-medium text-muted-foreground">Plan</th>
              <th className="px-3 py-2.5 font-medium text-muted-foreground">Seats</th>
              <th className="px-3 py-2.5 font-medium text-muted-foreground">Remaining</th>
              <th className="px-3 py-2.5 font-medium text-muted-foreground">Users</th>
              <th className="px-3 py-2.5 font-medium text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No organisations found.</td></tr>
            )}
            {filtered.map((org) => (
              <tr key={org.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2.5">
                  <p className="font-medium">{org.name}</p>
                  <p className="text-xs text-muted-foreground">#{org.id}</p>
                </td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={org.subscriptionStatus ?? "trial"} suspended={org.suspended} />
                </td>
                <td className="px-3 py-2.5 capitalize text-muted-foreground">{org.subscriptionType ?? "—"}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{org.userLimit}</td>
                <td className="px-3 py-2.5 text-muted-foreground font-mono text-xs">
                  {daysLeft(org.subscriptionEndDate, org.subscriptionType)}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {allUsers?.filter(u => u.organizationId === org.id).length ?? 0}
                </td>
                <td className="px-3 py-2.5">
                  <Button size="sm" variant="outline" onClick={() => setDetailId(org.id)}>
                    <Settings2 className="h-3.5 w-3.5 mr-1" />
                    Manage
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detailId && <OrgDetailDialog orgId={detailId} onClose={() => setDetailId(null)} />}
      <CreateOrgDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Users tab
// ---------------------------------------------------------------------------
function UsersTab() {
  const { data: allUsers, isLoading } = trpc.users.list.useQuery();
  const { data: orgs } = trpc.organizations.list.useQuery();
  const [search, setSearch] = useState("");

  const q = search.toLowerCase();

  // Group users by org, with unaffiliated (super_admin etc.) at the end
  const groups: { orgId: number | null; orgName: string; users: typeof allUsers }[] = [];

  if (allUsers && orgs) {
    // Build a map: orgId → users
    const byOrg = new Map<number | null, typeof allUsers>();

    for (const u of allUsers) {
      if (q && !u.email.toLowerCase().includes(q) && !(u.name ?? "").toLowerCase().includes(q)) continue;
      const key = u.organizationId ?? null;
      if (!byOrg.has(key)) byOrg.set(key, []);
      byOrg.get(key)!.push(u);
    }

    // Orgs in the order they come from the list query (already desc by createdAt)
    for (const org of orgs) {
      const users = byOrg.get(org.id);
      if (users && users.length > 0) {
        groups.push({ orgId: org.id, orgName: org.name, users });
      }
    }

    // Users with no org (e.g. super_admin)
    const noOrg = byOrg.get(null);
    if (noOrg && noOrg.length > 0) {
      groups.push({ orgId: null, orgName: "No organisation", users: noOrg });
    }
  }

  return (
    <div className="space-y-4">
      <Input placeholder="Search users…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />

      {isLoading && (
        <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
      )}

      {!isLoading && groups.length === 0 && (
        <p className="text-sm text-muted-foreground py-6 text-center">No users found.</p>
      )}

      <div className="space-y-4">
        {groups.map(({ orgId, orgName, users }) => (
          <div key={orgId ?? "no-org"} className="rounded-lg border overflow-hidden">
            {/* Group header */}
            <div className="px-3 py-2 bg-muted/60 border-b flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{orgName}</span>
              <span className="text-xs text-muted-foreground">{users!.length} user{users!.length !== 1 ? "s" : ""}</span>
            </div>

            {/* User rows */}
            <table className="w-full text-sm">
              <tbody className="divide-y">
                {users!.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2.5 w-64">
                      <p className="font-medium">{u.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge
                        variant={u.role === "super_admin" ? "default" : u.role === "org_owner" ? "secondary" : "outline"}
                        className="capitalize text-xs"
                      >
                        {u.role.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${u.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground text-right">
                      {new Date(u.createdAt).toLocaleDateString("en-AU")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function AdminPanel() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user || user.role !== "super_admin") {
    setLocation("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="TradeFlow" className="h-7 object-contain" />
            <div className="h-5 w-px bg-border" />
            <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{user.email}</span>
            <Button size="sm" variant="outline" onClick={() => setLocation("/login")}>Sign out</Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Manage all organisations and users</p>
        </div>

        <StatsRow />
        <ImpersonationPanel />

        <Tabs defaultValue="orgs">
          <TabsList>
            <TabsTrigger value="orgs">
              <Building2 className="h-3.5 w-3.5 mr-1.5" />
              Organisations
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Users
            </TabsTrigger>
          </TabsList>
          <TabsContent value="orgs" className="mt-4">
            <OrgsTab />
          </TabsContent>
          <TabsContent value="users" className="mt-4">
            <UsersTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
