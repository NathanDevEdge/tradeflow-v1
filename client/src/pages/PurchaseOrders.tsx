import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Plus, ShoppingCart, Eye } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function PurchaseOrders() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [notes, setNotes] = useState("");
  
  const { data: purchaseOrders, isLoading } = trpc.purchaseOrders.list.useQuery();
  const { data: suppliers } = trpc.suppliers.list.useQuery();
  const utils = trpc.useUtils();
  
  const createMutation = trpc.purchaseOrders.create.useMutation({
    onSuccess: () => {
      utils.purchaseOrders.list.invalidate();
      setOpen(false);
      resetForm();
      toast.success("Purchase order created successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setSelectedSupplierId("");
    setNotes("");
  };

  const handleCreate = () => {
    if (!selectedSupplierId) {
      toast.error("Please select a supplier");
      return;
    }
    createMutation.mutate({ 
      supplierId: parseInt(selectedSupplierId),
      notes: notes || undefined,
    });
  };

  const getSupplierName = (supplierId: number) => {
    const supplier = suppliers?.find(s => s.id === supplierId);
    return supplier?.companyName || "Unknown Supplier";
  };

  const getStatusClass = (status: string) => {
    const base = "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium";
    switch (status) {
      case "draft":     return `${base} bg-muted text-muted-foreground`;
      case "sent":      return `${base} bg-amber-50 text-amber-900`;
      case "received":  return `${base} bg-primary/10 text-primary`;
      case "cancelled": return `${base} bg-destructive/10 text-destructive`;
      default:          return `${base} bg-muted text-muted-foreground`;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b">
          <h1 className="text-base font-semibold">Purchase Orders</h1>
          {!isLoading && purchaseOrders && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {purchaseOrders.length}
            </span>
          )}
          <div className="flex-1" />
          <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New PO
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Purchase Order</DialogTitle>
                <DialogDescription>
                  Select a supplier and create a new purchase order
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier *</Label>
                  <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                    <SelectTrigger id="supplier">
                      <SelectValue placeholder="Select a supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers?.map((supplier) => (
                        <SelectItem key={supplier.id} value={String(supplier.id)}>
                          {supplier.companyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Add any notes for this purchase order..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" role="status" aria-label="Loading…" />
          </div>
        ) : purchaseOrders && purchaseOrders.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.map((po) => (
                    <TableRow 
                      key={po.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setLocation(`/purchase-orders/${po.id}`)}>
                      <TableCell className="font-medium">{po.poNumber}</TableCell>
                      <TableCell>{getSupplierName(po.supplierId)}</TableCell>
                      <TableCell>
                        <span className={getStatusClass(po.status)}>
                          {po.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        ${parseFloat(po.totalAmount).toFixed(2)}
                      </TableCell>
                      <TableCell>{new Date(po.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/purchase-orders/${po.id}`}>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ShoppingCart className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium mb-1">No purchase orders yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              Create your first purchase order to get started
            </p>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New PO
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
