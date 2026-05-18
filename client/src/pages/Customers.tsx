import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Plus, Edit, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Customers() {
  const [open, setOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    billingAddress: "",
    notes: "",
  });
  
  const { data: customers, isLoading } = trpc.customers.list.useQuery();
  const utils = trpc.useUtils();
  
  const createMutation = trpc.customers.create.useMutation({
    onSuccess: () => {
      utils.customers.list.invalidate();
      setOpen(false);
      resetForm();
      toast.success("Customer created successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const updateMutation = trpc.customers.update.useMutation({
    onSuccess: () => {
      utils.customers.list.invalidate();
      setOpen(false);
      resetForm();
      toast.success("Customer updated successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const deleteMutation = trpc.customers.delete.useMutation({
    onSuccess: () => {
      utils.customers.list.invalidate();
      toast.success("Customer deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      billingAddress: "",
      notes: "",
    });
    setEditingCustomer(null);
  };

  const handleSubmit = () => {
    if (!formData.companyName.trim()) {
      toast.error("Company name is required");
      return;
    }

    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (customer: any) => {
    setEditingCustomer(customer);
    setFormData({
      companyName: customer.companyName,
      contactName: customer.contactName || "",
      email: customer.email || "",
      phone: customer.phone || "",
      billingAddress: customer.billingAddress || "",
      notes: customer.notes || "",
    });
    setOpen(true);
  };

  const handleDelete = (id: number, companyName: string) => {
    if (confirm(`Are you sure you want to delete "${companyName}"?`)) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b">
          <h1 className="text-base font-semibold">Customers</h1>
          {!isLoading && customers && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {customers.length}
            </span>
          )}
          <div className="flex-1" />
          <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingCustomer ? "Edit Customer" : "Create New Customer"}</DialogTitle>
                <DialogDescription>
                  {editingCustomer ? "Update customer information" : "Add a new customer to your database"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Contact Name</Label>
                    <Input
                      id="contactName"
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billingAddress">Billing Address</Label>
                  <Textarea
                    id="billingAddress"
                    value={formData.billingAddress}
                    onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingCustomer ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" role="status" aria-label="Loading…" />
          </div>
        ) : customers && customers.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>Company Name</TableHead>
                    <TableHead>Contact Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow 
                      key={customer.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setLocation(`/customers/${customer.id}`)}
                    >
                      <TableCell className="font-medium">{customer.companyName}</TableCell>
                      <TableCell>{customer.contactName || "-"}</TableCell>
                      <TableCell>{customer.email || "-"}</TableCell>
                      <TableCell>{customer.phone || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(customer);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(customer.id, customer.companyName);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium mb-1">No customers yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              Create your first customer to get started
            </p>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Customer
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
