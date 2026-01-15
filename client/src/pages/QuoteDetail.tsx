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
import { ArrowLeft, Plus, Trash2, FileDown } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const quoteId = parseInt(id || "0");
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [selectedPricelistId, setSelectedPricelistId] = useState<string>("");
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [quantity, setQuantity] = useState("1");
  const [customSellPrice, setCustomSellPrice] = useState("");
  
  const { data: quote } = trpc.quotes.get.useQuery({ id: quoteId });
  const { data: items, isLoading } = trpc.quoteItems.list.useQuery({ quoteId });
  const { data: customer } = trpc.customers.get.useQuery(
    { id: quote?.customerId || 0 },
    { enabled: !!quote }
  );
  const { data: pricelists } = trpc.pricelists.list.useQuery();
  const { data: pricelistItems } = trpc.pricelistItems.list.useQuery(
    { pricelistId: parseInt(selectedPricelistId || "0") },
    { enabled: !!selectedPricelistId }
  );
  
  const utils = trpc.useUtils();
  
  const createItemMutation = trpc.quoteItems.create.useMutation({
    onSuccess: async () => {
      await utils.quoteItems.list.invalidate({ quoteId });
      await recalculateMutation.mutateAsync({ id: quoteId });
      await utils.quotes.get.invalidate({ id: quoteId });
      setAddItemOpen(false);
      resetForm();
      toast.success("Item added successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const deleteItemMutation = trpc.quoteItems.delete.useMutation({
    onSuccess: async () => {
      await utils.quoteItems.list.invalidate({ quoteId });
      await recalculateMutation.mutateAsync({ id: quoteId });
      await utils.quotes.get.invalidate({ id: quoteId });
      toast.success("Item deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const recalculateMutation = trpc.quotes.recalculateTotals.useMutation();
  
  const generatePDFMutation = trpc.quotes.generatePDF.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank");
      toast.success("PDF generated successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setSelectedPricelistId("");
    setSelectedItemId("");
    setQuantity("1");
    setCustomSellPrice("");
  };

  const handleAddItem = () => {
    if (!selectedItemId) {
      toast.error("Please select an item");
      return;
    }
    
    const item = pricelistItems?.find(i => i.id === parseInt(selectedItemId));
    if (!item) return;
    
    const qty = parseFloat(quantity);
    const sellPrice = customSellPrice ? parseFloat(customSellPrice) : parseFloat(item.sellPrice);
    const buyPrice = parseFloat(item.looseBuyPrice);
    
    createItemMutation.mutate({
      quoteId,
      pricelistItemId: item.id,
      itemName: item.itemName,
      quantity: qty,
      sellPrice,
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
      case "accepted": return "default";
      case "rejected": return "destructive";
      default: return "secondary";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/quotes">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold tracking-tight">{quote?.quoteNumber}</h1>
                {quote && (
                  <Badge variant={getStatusColor(quote.status)}>
                    {quote.status}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-2">
                Customer: {customer?.companyName || "Loading..."}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => generatePDFMutation.mutate({ id: quoteId })}
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
                  <DialogTitle>Add Item to Quote</DialogTitle>
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
                              {item.itemName} - ${parseFloat(item.sellPrice).toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
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
                    <div className="space-y-2">
                      <Label htmlFor="customSellPrice">Custom Sell Price</Label>
                      <Input
                        id="customSellPrice"
                        type="number"
                        step="0.01"
                        placeholder="Leave blank for default"
                        value={customSellPrice}
                        onChange={(e) => setCustomSellPrice(e.target.value)}
                      />
                    </div>
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

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${parseFloat(quote?.totalAmount || "0").toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Margin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${parseFloat(quote?.totalMargin || "0").toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Margin %</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{parseFloat(quote?.marginPercentage || "0").toFixed(1)}%</div>
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
              <CardTitle>Quote Items</CardTitle>
              <CardDescription>Internal view with margin calculations</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Buy Price</TableHead>
                    <TableHead className="text-right">Sell Price</TableHead>
                    <TableHead className="text-right">Margin/Unit</TableHead>
                    <TableHead className="text-right">Line Total</TableHead>
                    <TableHead className="text-right">Line Margin</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const marginPerUnit = parseFloat(item.sellPrice) - parseFloat(item.buyPrice);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell className="text-right">{parseFloat(item.quantity).toFixed(2)}</TableCell>
                        <TableCell className="text-right">${parseFloat(item.buyPrice).toFixed(2)}</TableCell>
                        <TableCell className="text-right">${parseFloat(item.sellPrice).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-green-600">${marginPerUnit.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">${parseFloat(item.lineTotal).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">${parseFloat(item.margin).toFixed(2)}</TableCell>
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
                    );
                  })}
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
                Add items from your pricelists to this quote
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
