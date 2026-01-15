import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Plus, Trash2, FileDown, Mail } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

export default function PurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const poId = parseInt(id || "0");
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [selectedPricelistId, setSelectedPricelistId] = useState<string>("");
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [quantity, setQuantity] = useState("1");
  
  const { data: purchaseOrder } = trpc.purchaseOrders.get.useQuery({ id: poId });
  const { data: items, isLoading } = trpc.purchaseOrderItems.list.useQuery({ purchaseOrderId: poId });
  const { data: supplier } = trpc.suppliers.get.useQuery(
    { id: purchaseOrder?.supplierId || 0 },
    { enabled: !!purchaseOrder }
  );
  const { data: pricelists } = trpc.pricelists.list.useQuery();
  const { data: pricelistItems } = trpc.pricelistItems.list.useQuery(
    { pricelistId: parseInt(selectedPricelistId || "0") },
    { enabled: !!selectedPricelistId }
  );
  
  const utils = trpc.useUtils();
  
  const createItemMutation = trpc.purchaseOrderItems.create.useMutation({
    onSuccess: async () => {
      await utils.purchaseOrderItems.list.invalidate({ purchaseOrderId: poId });
      await recalculateMutation.mutateAsync({ id: poId });
      await utils.purchaseOrders.get.invalidate({ id: poId });
      setAddItemOpen(false);
      resetForm();
      toast.success("Item added successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const deleteItemMutation = trpc.purchaseOrderItems.delete.useMutation({
    onSuccess: async () => {
      await utils.purchaseOrderItems.list.invalidate({ purchaseOrderId: poId });
      await recalculateMutation.mutateAsync({ id: poId });
      await utils.purchaseOrders.get.invalidate({ id: poId });
      toast.success("Item deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const recalculateMutation = trpc.purchaseOrders.recalculateTotals.useMutation();
  
  const generatePDFMutation = trpc.purchaseOrders.generatePDF.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank");
      toast.success("PDF generated successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const sendEmailMutation = trpc.purchaseOrders.sendEmail.useMutation({
    onSuccess: async () => {
      await utils.purchaseOrders.get.invalidate({ id: poId });
      toast.success("Purchase order sent successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setSelectedPricelistId("");
    setSelectedItemId("");
    setQuantity("1");
  };

  const handleAddItem = () => {
    if (!selectedItemId) {
      toast.error("Please select an item");
      return;
    }
    
    const item = pricelistItems?.find(i => i.id === parseInt(selectedItemId));
    if (!item) return;
    
    const qty = parseFloat(quantity);
    const buyPrice = parseFloat(item.looseBuyPrice);
    
    createItemMutation.mutate({
      purchaseOrderId: poId,
      pricelistItemId: item.id,
      itemName: item.itemName,
      quantity: qty,
      buyPrice,
    });
  };

  const handleDeleteItem = (itemId: number, itemName: string) => {
    if (confirm(`Are you sure you want to delete "${itemName}"?`)) {
      deleteItemMutation.mutate({ id: itemId });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "secondary";
      case "sent": return "default";
      case "received": return "default";
      case "cancelled": return "destructive";
      default: return "secondary";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/purchase-orders">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold tracking-tight">{purchaseOrder?.poNumber}</h1>
                {purchaseOrder && (
                  <Badge variant={getStatusColor(purchaseOrder.status)}>
                    {purchaseOrder.status}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-2">
                Supplier: {supplier?.companyName || "Loading..."}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => {
                if (!purchaseOrder?.pdfUrl) {
                  toast.error("Please generate PDF first before sending email");
                  return;
                }
                if (confirm(`Send purchase order ${purchaseOrder.poNumber} to ${supplier?.poEmail}?`)) {
                  sendEmailMutation.mutate({ id: poId });
                }
              }}
              disabled={sendEmailMutation.isPending || !purchaseOrder?.pdfUrl}
            >
              <Mail className="mr-2 h-4 w-4" />
              {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => generatePDFMutation.mutate({ id: poId })}
              disabled={generatePDFMutation.isPending || !items || items.length === 0}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {generatePDFMutation.isPending ? "Generating..." : "Export PDF"}
            </Button>
            <Dialog open={addItemOpen} onOpenChange={(isOpen) => { setAddItemOpen(isOpen); if (!isOpen) resetForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Item to Purchase Order</DialogTitle>
                  <DialogDescription>
                    Select an item from your pricelists
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="pricelist">Pricelist *</Label>
                    <Select value={selectedPricelistId} onValueChange={(value) => {
                      setSelectedPricelistId(value);
                      setSelectedItemId("");
                    }}>
                      <SelectTrigger id="pricelist">
                        <SelectValue placeholder="Select a pricelist" />
                      </SelectTrigger>
                      <SelectContent>
                        {pricelists?.map((pricelist) => (
                          <SelectItem key={pricelist.id} value={String(pricelist.id)}>
                            {pricelist.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedPricelistId && (
                    <div className="space-y-2">
                      <Label htmlFor="item">Item *</Label>
                      <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                        <SelectTrigger id="item">
                          <SelectValue placeholder="Select an item" />
                        </SelectTrigger>
                        <SelectContent>
                          {pricelistItems?.map((item) => (
                            <SelectItem key={item.id} value={String(item.id)}>
                              {item.itemName} - ${parseFloat(item.looseBuyPrice).toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.01"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setAddItemOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddItem} disabled={createItemMutation.isPending}>
                    {createItemMutation.isPending ? "Adding..." : "Add Item"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${parseFloat(purchaseOrder?.totalAmount || "0").toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{items?.length || 0}</div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading items...</p>
          </div>
        ) : items && items.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Purchase Order Items</CardTitle>
              <CardDescription>Items showing buy prices only</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Buy Price</TableHead>
                    <TableHead className="text-right">Line Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.itemName}</TableCell>
                      <TableCell className="text-right">{parseFloat(item.quantity).toFixed(2)}</TableCell>
                      <TableCell className="text-right">${parseFloat(item.buyPrice).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">${parseFloat(item.lineTotal).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDeleteItem(item.id, item.itemName)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Plus className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No items yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add items from your pricelists to this purchase order
              </p>
              <Button onClick={() => setAddItemOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
