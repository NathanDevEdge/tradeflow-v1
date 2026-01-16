import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/SearchableSelect";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Plus, Trash2, FileDown } from "lucide-react";
import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";

export default function QuoteDetail() {
  const [, params] = useRoute("/quotes/:id");
  const [, setLocation] = useLocation();
  const quoteId = params?.id ? parseInt(params.id) : 0;

  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");

  const { data: quote, isLoading } = trpc.quotes.get.useQuery({ id: quoteId });
  const { data: customer } = trpc.customers.get.useQuery(
    { id: quote?.customerId || 0 },
    { enabled: !!quote?.customerId }
  );
  const { data: allProducts } = trpc.pricelistItems.listAll.useQuery();
  const utils = trpc.useUtils();

  const addItemMutation = trpc.quoteItems.create.useMutation({
    onSuccess: async () => {
      await utils.quotes.get.invalidate({ id: quoteId });
      setSelectedProductId("");
      setQuantity("1");
      toast.success("Item added to quote");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteItemMutation = trpc.quoteItems.delete.useMutation({
    onSuccess: async () => {
      await utils.quotes.get.invalidate({ id: quoteId });
      toast.success("Item removed from quote");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const generatePDFMutation = trpc.quotes.generatePDF.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
        toast.success("PDF generated successfully");
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleAddItem = () => {
    if (!selectedProductId) {
      toast.error("Please select a product");
      return;
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    const product = allProducts?.find(p => p.id === parseInt(selectedProductId));
    if (!product) {
      toast.error("Product not found");
      return;
    }

    const sellPrice = parseFloat(product.sellPrice || product.rrpExGst || "0");
    const buyPrice = parseFloat(product.looseBuyPrice || "0");
    const qty = parseFloat(quantity);
    const lineTotal = sellPrice * qty;
    const margin = lineTotal - (buyPrice * qty);

    addItemMutation.mutate({
      quoteId,
      pricelistItemId: product.id,
      itemName: product.itemName,
      quantity: qty,
      sellPrice,
      buyPrice,
    });
  };

  const handleDeleteItem = (itemId: number) => {
    if (confirm("Are you sure you want to remove this item?")) {
      deleteItemMutation.mutate({ id: itemId });
    }
  };

  const handleGeneratePDF = () => {
    generatePDFMutation.mutate({ id: quoteId });
  };

  const productOptions = allProducts?.map((product: any) => ({
    value: product.id.toString(),
    label: `${product.itemName} ${product.skuCode ? `(${product.skuCode})` : ""} - $${parseFloat(product.sellPrice || product.rrpExGst || "0").toFixed(2)}`,
  })) || [];

  // Calculate selected product details for preview
  const selectedProduct = selectedProductId ? allProducts?.find((p: any) => p.id === parseInt(selectedProductId)) : null;
  const previewSellPrice = selectedProduct ? parseFloat(selectedProduct.sellPrice || selectedProduct.rrpExGst || "0") : 0;
  const previewBuyPrice = selectedProduct ? parseFloat(selectedProduct.looseBuyPrice || "0") : 0;
  const previewQuantity = parseFloat(quantity) || 0;
  const previewLineTotal = previewSellPrice * previewQuantity;
  const previewMargin = previewLineTotal - (previewBuyPrice * previewQuantity);
  const previewMarginPercent = previewLineTotal > 0 ? (previewMargin / previewLineTotal) * 100 : 0;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!quote) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Quote not found</h2>
          <Button onClick={() => setLocation("/quotes")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Quotes
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/quotes")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{quote.quoteNumber}</h1>
              <p className="text-muted-foreground mt-1">
                Customer: {customer?.companyName || "Loading..."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={quote.status === "draft" ? "secondary" : "default"}>
              {quote.status}
            </Badge>
            <Button onClick={handleGeneratePDF} disabled={generatePDFMutation.isPending}>
              <FileDown className="mr-2 h-4 w-4" />
              {generatePDFMutation.isPending ? "Generating..." : "Export PDF"}
            </Button>
          </div>
        </div>

        {/* Quote Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${parseFloat(quote.totalAmount || "0").toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Margin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${parseFloat(quote.totalMargin || "0").toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Margin %</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{quote.marginPercentage || "0"}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Add Product Section */}
        <Card>
          <CardHeader>
            <CardTitle>Add Product to Quote</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="product">Search Product *</Label>
                <SearchableSelect
                  options={productOptions}
                  value={selectedProductId}
                  onValueChange={setSelectedProductId}
                  placeholder="Search for a product..."
                  searchPlaceholder="Search by name or SKU..."
                  emptyText="No products found."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Enter quantity"
                />
              </div>
            </div>

            {/* Preview Section */}
            {selectedProduct && (
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <h4 className="font-semibold text-sm">Preview</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Sell Price</p>
                    <p className="font-medium">${previewSellPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Buy Price</p>
                    <p className="font-medium">${previewBuyPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Line Total</p>
                    <p className="font-medium">${previewLineTotal.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Margin</p>
                    <p className="font-medium text-green-600">${previewMargin.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Margin %</p>
                    <p className="font-medium text-green-600">{previewMarginPercent.toFixed(2)}%</p>
                  </div>
                </div>
              </div>
            )}

            <Button onClick={handleAddItem} disabled={addItemMutation.isPending}>
              <Plus className="mr-2 h-4 w-4" />
              {addItemMutation.isPending ? "Adding..." : "Add to Quote"}
            </Button>
          </CardContent>
        </Card>

        {/* Quote Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>Quote Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {quote.items && quote.items.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Sell Price</TableHead>
                    <TableHead className="text-right">Buy Price</TableHead>
                    <TableHead className="text-right">Line Total</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quote.items.map((item) => {
                    const itemMarginPercent = parseFloat(item.lineTotal) > 0
                      ? (parseFloat(item.margin) / parseFloat(item.lineTotal)) * 100
                      : 0;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.itemName}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">${parseFloat(item.sellPrice).toFixed(2)}</TableCell>
                        <TableCell className="text-right">${parseFloat(item.buyPrice).toFixed(2)}</TableCell>
                        <TableCell className="text-right">${parseFloat(item.lineTotal).toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <span className="text-green-600 font-medium">
                            ${parseFloat(item.margin).toFixed(2)} ({itemMarginPercent.toFixed(2)}%)
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteItem(item.id)}
                            disabled={deleteItemMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="p-12 text-center">
                <p className="text-muted-foreground">No items added to this quote yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
