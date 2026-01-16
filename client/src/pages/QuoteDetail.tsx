import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, FileDown, Trash2, Search } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";

export default function QuoteDetail() {
  const [, params] = useRoute("/quotes/:id");
  const [, setLocation] = useLocation();
  const quoteId = params?.id ? parseInt(params.id) : 0;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPricelistId, setSelectedPricelistId] = useState<string>("all");
  const [editingItems, setEditingItems] = useState<Record<number, { quantity: number; sellPrice: number }>>({});
  const [priceInputs, setPriceInputs] = useState<Record<number, string>>({});

  const { data: quote, isLoading } = trpc.quotes.get.useQuery({ id: quoteId });
  const { data: customer } = trpc.customers.get.useQuery(
    { id: quote?.customerId || 0 },
    { enabled: !!quote?.customerId }
  );
  const { data: allProducts } = trpc.pricelistItems.listAll.useQuery();
  const { data: pricelists } = trpc.pricelists.list.useQuery();
  const utils = trpc.useUtils();

  const addItemMutation = trpc.quoteItems.create.useMutation({
    onMutate: async (newItem) => {
      // Cancel outgoing refetches
      await utils.quotes.get.cancel({ id: quoteId });
      
      // Snapshot the previous value
      const previousQuote = utils.quotes.get.getData({ id: quoteId });
      
      // Optimistically update to the new value
      if (previousQuote) {
        const optimisticItem = {
          id: Date.now(), // Temporary ID
          quoteId,
          pricelistItemId: newItem.pricelistItemId || null,
          itemName: newItem.itemName,
          quantity: newItem.quantity.toFixed(2),
          sellPrice: newItem.sellPrice.toFixed(2),
          buyPrice: newItem.buyPrice.toFixed(2),
          margin: ((newItem.sellPrice - newItem.buyPrice) * newItem.quantity).toFixed(2),
          lineTotal: (newItem.sellPrice * newItem.quantity).toFixed(2),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        utils.quotes.get.setData({ id: quoteId }, {
          ...previousQuote,
          items: [...(previousQuote.items || []), optimisticItem],
        });
      }
      
      return { previousQuote };
    },
    onSuccess: async () => {
      await utils.quotes.get.invalidate({ id: quoteId });
      setSearchQuery("");
    },
    onError: (error, newItem, context) => {
      // Rollback on error
      if (context?.previousQuote) {
        utils.quotes.get.setData({ id: quoteId }, context.previousQuote);
      }
      toast.error(error.message);
    },
  });

  const updateItemMutation = trpc.quoteItems.update.useMutation({
    onMutate: async (updatedItem) => {
      // Cancel outgoing refetches
      await utils.quotes.get.cancel({ id: quoteId });
      
      // Snapshot the previous value
      const previousQuote = utils.quotes.get.getData({ id: quoteId });
      
      // Optimistically update to the new value
      if (previousQuote && previousQuote.items) {
        const updatedItems = previousQuote.items.map(item => {
          if (item.id === updatedItem.id) {
            const quantity = updatedItem.quantity ?? parseFloat(item.quantity);
            const sellPrice = updatedItem.sellPrice ?? parseFloat(item.sellPrice);
            const buyPrice = parseFloat(item.buyPrice);
            const lineTotal = quantity * sellPrice;
            const margin = (sellPrice - buyPrice) * quantity;
            
            return {
              ...item,
              quantity: quantity.toFixed(2),
              sellPrice: sellPrice.toFixed(2),
              lineTotal: lineTotal.toFixed(2),
              margin: margin.toFixed(2),
            };
          }
          return item;
        });
        
        utils.quotes.get.setData({ id: quoteId }, {
          ...previousQuote,
          items: updatedItems,
        });
      }
      
      return { previousQuote };
    },
    onSuccess: async () => {
      await utils.quotes.get.invalidate({ id: quoteId });
    },
    onError: (error, updatedItem, context) => {
      // Rollback on error
      if (context?.previousQuote) {
        utils.quotes.get.setData({ id: quoteId }, context.previousQuote);
      }
      toast.error(error.message);
    },
  });

  const deleteItemMutation = trpc.quoteItems.delete.useMutation({
    onMutate: async (deletedItem) => {
      // Cancel outgoing refetches
      await utils.quotes.get.cancel({ id: quoteId });
      
      // Snapshot the previous value
      const previousQuote = utils.quotes.get.getData({ id: quoteId });
      
      // Optimistically update to the new value
      if (previousQuote && previousQuote.items) {
        utils.quotes.get.setData({ id: quoteId }, {
          ...previousQuote,
          items: previousQuote.items.filter(item => item.id !== deletedItem.id),
        });
      }
      
      return { previousQuote };
    },
    onSuccess: async () => {
      await utils.quotes.get.invalidate({ id: quoteId });
    },
    onError: (error, deletedItem, context) => {
      // Rollback on error
      if (context?.previousQuote) {
        utils.quotes.get.setData({ id: quoteId }, context.previousQuote);
      }
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

  const updateStatusMutation = trpc.quotes.update.useMutation({
    onSuccess: async () => {
      await utils.quotes.get.invalidate({ id: quoteId });
      toast.success("Quote status updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleStatusChange = (newStatus: string) => {
    updateStatusMutation.mutate({ id: quoteId, status: newStatus as any });
  };

  // Filter products based on search query and selected pricelist
  const filteredProducts = useMemo(() => {
    if (!allProducts) return [];
    
    let filtered = allProducts;
    
    // Filter by pricelist
    if (selectedPricelistId !== "all") {
      filtered = filtered.filter(p => p.pricelistId === parseInt(selectedPricelistId));
    }
    
    // Filter by search query (partial match on item name or SKU)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.itemName.toLowerCase().includes(query) || 
        (p.skuCode && p.skuCode.toLowerCase().includes(query))
      );
    }
    
    return filtered.slice(0, 10); // Limit to 10 results
  }, [allProducts, searchQuery, selectedPricelistId]);

  const handleAddProduct = (product: any) => {
    const sellPrice = parseFloat(product.sellPrice || product.rrpExGst || "0");
    const buyPrice = parseFloat(product.looseBuyPrice || "0");
    const quantity = 1;

    addItemMutation.mutate({
      quoteId,
      pricelistItemId: product.id,
      itemName: product.itemName,
      quantity,
      sellPrice,
      buyPrice,
    });
  };

  const handleUpdateItem = (itemId: number, quantity: number, sellPrice: number) => {
    const item = quote?.items?.find(i => i.id === itemId);
    if (!item) return;

    updateItemMutation.mutate({
      id: itemId,
      quantity,
      sellPrice,
    });
    
    // Clear editing state
    setEditingItems(prev => {
      const newState = { ...prev };
      delete newState[itemId];
      return newState;
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

  // Initialize editing state when items change
  useEffect(() => {
    if (quote?.items) {
      const initialState: Record<number, { quantity: number; sellPrice: number }> = {};
      quote.items.forEach(item => {
        initialState[item.id] = {
          quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity,
          sellPrice: parseFloat(item.sellPrice),
        };
      });
      setEditingItems(initialState);
    }
  }, [quote?.items]);

  // Calculate totals
  const calculations = useMemo(() => {
    if (!quote?.items) return { subtotal: 0, totalMargin: 0, marginPercent: 0, gst: 0, total: 0 };
    
    const subtotal = quote.items.reduce((sum, item) => {
      const qty = editingItems[item.id]?.quantity ?? item.quantity;
      const price = editingItems[item.id]?.sellPrice ?? parseFloat(item.sellPrice);
      return sum + (qty * price);
    }, 0);
    
    const totalCost = quote.items.reduce((sum, item) => {
      const qty = editingItems[item.id]?.quantity ?? item.quantity;
      const buyPrice = parseFloat(item.buyPrice);
      return sum + (qty * buyPrice);
    }, 0);
    
    const totalMargin = subtotal - totalCost;
    const marginPercent = subtotal > 0 ? (totalMargin / subtotal) * 100 : 0;
    const gst = subtotal * 0.1;
    const total = subtotal + gst;
    
    return { subtotal, totalMargin, marginPercent, gst, total };
  }, [quote?.items, editingItems]);

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
            {/* Status Workflow Buttons */}
            {quote.status === "draft" && (
              <Button 
                onClick={() => handleStatusChange("sent")}
                disabled={updateStatusMutation.isPending}
                variant="outline"
              >
                Mark as Sent
              </Button>
            )}
            {quote.status === "sent" && (
              <>
                <Button 
                  onClick={() => handleStatusChange("accepted")}
                  disabled={updateStatusMutation.isPending}
                  variant="default"
                >
                  Accept Quote
                </Button>
                <Button 
                  onClick={() => handleStatusChange("declined")}
                  disabled={updateStatusMutation.isPending}
                  variant="destructive"
                >
                  Decline Quote
                </Button>
              </>
            )}
            
            <Badge variant={
              quote.status === "draft" ? "secondary" :
              quote.status === "sent" ? "default" :
              quote.status === "accepted" ? "default" :
              "destructive"
            }>
              {quote.status.toUpperCase()}
            </Badge>
            
            <Button onClick={handleGeneratePDF} disabled={generatePDFMutation.isPending}>
              <FileDown className="mr-2 h-4 w-4" />
              {generatePDFMutation.isPending ? "Generating..." : "Export PDF"}
            </Button>
          </div>
        </div>

        {/* Line Items Card */}
        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filter */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by item name or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedPricelistId} onValueChange={setSelectedPricelistId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Pricelists" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pricelists</SelectItem>
                  {pricelists?.map((pricelist) => (
                    <SelectItem key={pricelist.id} value={pricelist.id.toString()}>
                      {pricelist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Results */}
            {searchQuery && filteredProducts.length > 0 && (
              <div className="border rounded-lg p-2 max-h-60 overflow-y-auto space-y-1">
                {filteredProducts.map((product: any) => (
                  <button
                    key={product.id}
                    onClick={() => handleAddProduct(product)}
                    className="w-full text-left px-3 py-2 hover:bg-muted rounded-md transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">{product.itemName}</div>
                      {product.skuCode && (
                        <div className="text-sm text-muted-foreground">{product.skuCode}</div>
                      )}
                    </div>
                    <div className="text-sm font-medium">
                      ${parseFloat(product.sellPrice || product.rrpExGst || "0").toFixed(2)}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Items Table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Item</th>
                    <th className="text-left p-3 font-medium">SKU</th>
                    <th className="text-right p-3 font-medium">Quantity</th>
                    <th className="text-right p-3 font-medium">Unit Price</th>
                    <th className="text-right p-3 font-medium">Margin/Unit</th>
                    <th className="text-right p-3 font-medium">Margin %</th>
                    <th className="text-right p-3 font-medium">Total</th>
                    <th className="text-right p-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items && quote.items.length > 0 ? (
                    quote.items.map((item) => {
                      const qty = editingItems[item.id]?.quantity ?? (typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity);
                      const sellPrice = editingItems[item.id]?.sellPrice ?? parseFloat(item.sellPrice);
                      const buyPrice = parseFloat(item.buyPrice);
                      const lineTotal = qty * sellPrice;
                      const marginPerUnit = sellPrice - buyPrice;
                      const marginPercent = sellPrice > 0 ? (marginPerUnit / sellPrice) * 100 : 0;
                      
                      const hasChanges = 
                        (editingItems[item.id]?.quantity !== undefined && Math.abs(editingItems[item.id]?.quantity - (typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity)) > 0.01) ||
                        (editingItems[item.id]?.sellPrice !== undefined && Math.abs(editingItems[item.id]?.sellPrice - parseFloat(item.sellPrice)) > 0.01);

                      return (
                        <tr key={item.id} className="border-t">
                          <td className="p-3">{item.itemName}</td>
                          <td className="p-3 text-muted-foreground">{item.pricelistItemId}</td>
                          <td className="p-3">
                            <Input
                              type="number"
                              min="1"
                              step="1"
                              value={qty}
                              onChange={(e) => {
                                const newQty = parseFloat(e.target.value) || 1;
      setEditingItems(prev => ({
        ...prev,
        [item.id]: { quantity: newQty, sellPrice: prev[item.id]?.sellPrice ?? parseFloat(item.sellPrice) }
      }));
                              }}
                              onBlur={() => {
                                if (hasChanges) {
                                  handleUpdateItem(item.id, qty, sellPrice);
                                }
                              }}
                              className="w-24 text-right"
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-muted-foreground">$</span>
                              <Input
                                type="text"
                                inputMode="decimal"
                                value={priceInputs[item.id] ?? sellPrice.toFixed(2)}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Allow empty, numbers, and decimal point
                                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                    setPriceInputs(prev => ({ ...prev, [item.id]: value }));
                                    const newPrice = parseFloat(value) || 0;
                                    setEditingItems(prev => ({
                                      ...prev,
                                      [item.id]: { quantity: prev[item.id]?.quantity ?? qty, sellPrice: newPrice }
                                    }));
                                  }
                                }}
                                onFocus={(e) => {
                                  // Select all on focus for easy replacement
                                  e.target.select();
                                }}
                                onBlur={() => {
                                  // Clean up the input display
                                  const finalPrice = sellPrice || 0;
                                  setPriceInputs(prev => ({ ...prev, [item.id]: finalPrice.toFixed(2) }));
                                  if (hasChanges) {
                                    handleUpdateItem(item.id, qty, finalPrice);
                                  }
                                }}
                                className="w-28 text-right"
                              />
                            </div>
                          </td>
                          <td className="p-3 text-right text-green-600 font-medium">
                            ${marginPerUnit.toFixed(2)}
                          </td>
                          <td className="p-3 text-right text-green-600 font-medium">
                            {marginPercent.toFixed(1)}%
                          </td>
                          <td className="p-3 text-right font-medium">
                            ${lineTotal.toFixed(2)}
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteItem(item.id)}
                              disabled={deleteItemMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-muted-foreground">
                        No items added to this quote yet. Search for products above to add them.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals Section */}
            {quote.items && quote.items.length > 0 && (
              <div className="flex justify-end">
                <div className="w-full md:w-96 space-y-2 border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span className="font-medium">${calculations.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Margin:</span>
                    <span className="font-medium text-green-600">
                      ${calculations.totalMargin.toFixed(2)} ({calculations.marginPercent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>GST (10%):</span>
                    <span className="font-medium">${calculations.gst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>${calculations.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
