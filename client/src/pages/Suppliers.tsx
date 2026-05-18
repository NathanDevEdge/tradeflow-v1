import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Plus, Edit, Trash2, Building2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Suppliers() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [formData, setFormData] = useState({
    companyName: "",
    billingAddress: "",
    keyContactName: "",
    keyContactEmail: "",
    poEmail: "",
    notes: "",
  });
  
  const { data: suppliers, isLoading } = trpc.suppliers.list.useQuery();
  const utils = trpc.useUtils();
  
  const createMutation = trpc.suppliers.create.useMutation({
    onSuccess: () => {
      utils.suppliers.list.invalidate();
      setOpen(false);
      resetForm();
      toast.success("Supplier created successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const updateMutation = trpc.suppliers.update.useMutation({
    onSuccess: () => {
      utils.suppliers.list.invalidate();
      setOpen(false);
      resetForm();
      toast.success("Supplier updated successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const deleteMutation = trpc.suppliers.delete.useMutation({
    onSuccess: () => {
      utils.suppliers.list.invalidate();
      toast.success("Supplier deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      companyName: "",
      billingAddress: "",
      keyContactName: "",
      keyContactEmail: "",
      poEmail: "",
      notes: "",
    });
    setEditingSupplier(null);
  };

  const handleSubmit = () => {
    if (!formData.companyName.trim()) {
      toast.error("Company name is required");
      return;
    }
    if (!formData.poEmail.trim()) {
      toast.error("PO email is required");
      return;
    }

    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (supplier: any) => {
    setEditingSupplier(supplier);
    setFormData({
      companyName: supplier.companyName,
      billingAddress: supplier.billingAddress || "",
      keyContactName: supplier.keyContactName || "",
      keyContactEmail: supplier.keyContactEmail || "",
      poEmail: supplier.poEmail,
      notes: supplier.notes || "",
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
          <h1 className="text-base font-semibold">Suppliers</h1>
          {!isLoading && suppliers && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {suppliers.length}
            </span>
          )}
          <div className="flex-1" />
          <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New Supplier
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingSupplier ? "Edit Supplier" : "Create New Supplier"}</DialogTitle>
                <DialogDescription>
                  {editingSupplier ? "Update supplier information" : "Add a new supplier to your database"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="poEmail">Purchase Order Email *</Label>
                  <Input
                    id="poEmail"
                    type="email"
                    value={formData.poEmail}
                    onChange={(e) => setFormData({ ...formData, poEmail: e.target.value })}
                    placeholder="orders@supplier.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    This email will be used to send purchase orders
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="keyContactName">Key Contact Name</Label>
                    <Input
                      id="keyContactName"
                      value={formData.keyContactName}
                      onChange={(e) => setFormData({ ...formData, keyContactName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="keyContactEmail">Key Contact Email</Label>
                    <Input
                      id="keyContactEmail"
                      type="email"
                      value={formData.keyContactEmail}
                      onChange={(e) => setFormData({ ...formData, keyContactEmail: e.target.value })}
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
                  {editingSupplier ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" role="status" aria-label="Loading…" />
          </div>
        ) : suppliers && suppliers.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>Company Name</TableHead>
                    <TableHead>Key Contact</TableHead>
                    <TableHead>PO Email</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier) => (
                    <TableRow 
                      key={supplier.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setLocation(`/suppliers/${supplier.id}`)}>
                    
                      <TableCell className="font-medium">{supplier.companyName}</TableCell>
                      <TableCell>{supplier.keyContactName || "-"}</TableCell>
                      <TableCell>{supplier.poEmail}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(supplier)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDelete(supplier.id, supplier.companyName)}
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
            <Building2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium mb-1">No suppliers yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              Create your first supplier to get started
            </p>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Supplier
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
