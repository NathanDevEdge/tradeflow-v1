import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Plus, Trash2, FileDown, Mail, Search, MapPin } from "lucide-react";
import { ShippingAddressModal } from "@/components/ShippingAddressModal";
import { useState, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { toast } from "sonner";

export default function PurchaseOrderDetailNew() {
  const [, params] = useRoute("/purchase-orders/:id");
  const [, setLocation] = useLocation();
  const poId = params?.id ? parseInt(params.id) : 0;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPricelistId, setSelectedPricelistId] = useState<string>("all");
  const [editingItems, setEditingItems] = useState<Record<number, { quantity: number }>>({});
  const [shippingModalOpen, setShippingModalOpen] = useState(false);

  const { data: purchaseOrder, isLoading } = trpc.purchaseOrders.get.useQuery({ id: poId });
  const { data: supplier } = trpc.suppliers.get.useQuery(
    { id: purchaseOrder?.supplierId || 0 },
    { enabled: !!purchaseOrder }
  );
  const { data: allProducts } = trpc.pricelistItems.listAll.useQuery();
  const { data: pricelists } = trpc.pricelists.list.useQuery();
  const utils = trpc.useUtils();

  const addItemMutation = trpc.purchaseOrderItems.create.useMutation({
    onMutate: async (newItem) => {
      await utils.purchaseOrders.get.cancel({ id: poId });
      const previousPO = utils.purchaseOrders.get.getData({ id: poId });
      
      if (previousPO) {
        const optimisticItem = {
          id: Date.now(),
          purchaseOrderId: poId,
          pricelistItemId: newItem.pricelistItemId || null,
          itemName: newItem.itemName,
          quantity: newItem.quantity.toFixed(2),
          buyPrice: newItem.buyPrice.toFixed(2),
          lineTotal: (newItem.buyPrice * newItem.quantity).toFixed(2),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        utils.purchaseOrders.get.setData({ id: poId }, {
          ...previousPO,
          items: [...(previousPO.items || []), optimisticItem],
        });
      }
      
      return { previousPO };
    },
    onSuccess: async () => {
      await utils.purchaseOrders.get.invalidate({ id: poId });
      setSearchQuery("");
    },
    onError: (error, newItem, context) => {
      if (context?.previousPO) {
        utils.purchaseOrders.get.setData({ id: poId }, context.previousPO);
      }
      toast.error(error.message);
    },
  });

  const updateItemMutation = trpc.purchaseOrderItems.update.useMutation({
    onMutate: async (updatedItem) => {
      await utils.purchaseOrders.get.cancel({ id: poId });
      const previousPO = utils.purchaseOrders.get.getData({ id: poId });
      
      if (previousPO && previousPO.items && allProducts) {
        const updatedItems = previousPO.items.map(item => {
          if (item.id === updatedItem.id) {
            const quantity = updatedItem.quantity ?? parseFloat(item.quantity);
            
            // Recalculate buy price based on quantity
            let buyPrice = parseFloat(item.buyPrice);
            
            if (item.pricelistItemId) {
              const pricelistItem = allProducts.find(p => p.id === item.pricelistItemId);
              if (pricelistItem) {
                const looseBuyPrice = parseFloat(pricelistItem.looseBuyPrice);
                const packBuyPrice = pricelistItem.packBuyPrice ? parseFloat(pricelistItem.packBuyPrice) : null;
                const packSize = pricelistItem.packSize ? parseFloat(pricelistItem.packSize) : null;
                
                // Apply smart pricing logic
                if (packSize && packBuyPrice && quantity >= packSize) {
                  buyPrice = packBuyPrice;
                } else {
                  buyPrice = looseBuyPrice;
                }
              }
            }
            
            const lineTotal = quantity * buyPrice;
            
            return {
              ...item,
              quantity: quantity.toFixed(2),
              buyPrice: buyPrice.toFixed(2),
              lineTotal: lineTotal.toFixed(2),
            };
          }
          return item;
        });
        
        utils.purchaseOrders.get.setData({ id: poId }, {
          ...previousPO,
          items: updatedItems,
        });
      }
      
      return { previousPO };
    },
    onSuccess: async () => {
      await utils.purchaseOrders.get.invalidate({ id: poId });
    },
    onError: (error, updatedItem, context) => {
      if (context?.previousPO) {
        utils.purchaseOrders.get.setData({ id: poId }, context.previousPO);
      }
      toast.error(error.message);
    },
  });

  const deleteItemMutation = trpc.purchaseOrderItems.delete.useMutation({
    onMutate: async (deletedItem) => {
      await utils.purchaseOrders.get.cancel({ id: poId });
      const previousPO = utils.purchaseOrders.get.getData({ id: poId });
      
      if (previousPO && previousPO.items) {
        utils.purchaseOrders.get.setData({ id: poId }, {
          ...previousPO,
          items: previousPO.items.filter(item => item.id !== deletedItem.id),
        });
      }
      
      return { previousPO };
    },
    onSuccess: async () => {
      await utils.purchaseOrders.get.invalidate({ id: poId });
    },
    onError: (error, deletedItem, context) => {
      if (context?.previousPO) {
        utils.purchaseOrders.get.setData({ id: poId }, context.previousPO);
      }
      toast.error(error.message);
    },
  });

  const updatePOMutation = trpc.purchaseOrders.update.useMutation({
    onSuccess: async () => {
      await utils.purchaseOrders.get.invalidate({ id: poId });
      toast.success("Purchase order updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const generatePDFMutation = trpc.purchaseOrders.generatePDF.useMutation({
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

  // Filter products based on search query and selected pricelist
  const filteredProducts = useMemo(() => {
    if (!allProducts) return [];
    
    let filtered = allProducts;
    
    // Filter by pricelist
    if (selectedPricelistId !== "all") {
      filtered = filtered.filter(p => p.pricelistId === parseInt(selectedPricelistId));
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.itemName.toLowerCase().includes(query) ||
        (p.skuCode && p.skuCode.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [allProducts, searchQuery, selectedPricelistId]);

  const handleAddProduct = (product: any) => {
    // Calculate buy price based on quantity (default to 1)
    const quantity = 1;
    const looseBuyPrice = parseFloat(product.looseBuyPrice);
    const packBuyPrice = product.packBuyPrice ? parseFloat(product.packBuyPrice) : null;
    const packSize = product.packSize ? parseFloat(product.packSize) : null;
    
    let buyPrice = looseBuyPrice;
    if (packSize && packBuyPrice && quantity >= packSize) {
      buyPrice = packBuyPrice;
    }

    addItemMutation.mutate({
      purchaseOrderId: poId,
      pricelistItemId: product.id,
      itemName: product.itemName,
      quantity,
      buyPrice,
    });
  };

  const handleUpdateItem = (itemId: number, quantity: number) => {
    updateItemMutation.mutate({
      id: itemId,
      quantity,
    });
  };

  const handleDeleteItem = (itemId: number) => {
    deleteItemMutation.mutate({ id: itemId });
  };

  // Calculate totals
  const calculations = useMemo(() => {
    if (!purchaseOrder?.items) {
      return { subtotal: 0, gst: 0, grandTotal: 0 };
    }

    const subtotal = purchaseOrder.items.reduce((sum, item) => {
      return sum + parseFloat(item.lineTotal);
    }, 0);

    const gst = subtotal * 0.1; // 10% GST
    const grandTotal = subtotal + gst;

    return { subtotal, gst, grandTotal };
  }, [purchaseOrder?.items]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "secondary";
      case "sent": return "default";
      case "received": return "default";
      case "cancelled": return "destructive";
      default: return "secondary";
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Loading purchase order...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!purchaseOrder) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <p className="text-muted-foreground mb-4">Purchase order not found</p>
          <Button onClick={() => setLocation("/purchase-orders")}>Back to Purchase Orders</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/purchase-orders")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold tracking-tight">{purchaseOrder.poNumber}</h1>
                <Badge variant={getStatusColor(purchaseOrder.status)}>
                  {purchaseOrder.status}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">
                Supplier: {supplier?.companyName || "Loading..."}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => generatePDFMutation.mutate({ id: poId })}
              disabled={generatePDFMutation.isPending || !purchaseOrder.items || purchaseOrder.items.length === 0}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {generatePDFMutation.isPending ? "Generating..." : "Export PDF"}
            </Button>
          </div>
        </div>

        {/* Company Billing Details & Delivery Info */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Company Billing Details</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Company Name</p>
                <p className="font-medium">Your Company Pty Ltd</p>
              </div>
              <div>
                <p className="text-muted-foreground">ABN</p>
                <p className="font-medium">12 345 678 901</p>
              </div>
              <div>
                <p className="text-muted-foreground">Billing Address</p>
                <p className="font-medium">123 Business St<br/>Melbourne VIC 3000<br/>Australia</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Delivery Information</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="deliveryMethod">Delivery Method</Label>
                <Select 
                  value={purchaseOrder.deliveryMethod || "pickup_from_supplier"}
                  onValueChange={(value) => {
                    updatePOMutation.mutate({
                      id: poId,
                      deliveryMethod: value as any,
                    });
                  }}
                >
                  <SelectTrigger id="deliveryMethod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pickup_from_supplier">Pickup from Supplier</SelectItem>
                    <SelectItem value="in_store_delivery">In-store Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {purchaseOrder.deliveryMethod === "in_store_delivery" && (
                <div className="space-y-2">
                  <Label>Shipping Address</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-3"
                      onClick={() => setShippingModalOpen(true)}
                    >
                      <MapPin className="h-4 w-4 mr-2 shrink-0" />
                      <span className="whitespace-pre-wrap text-sm">
                        {purchaseOrder.shippingAddress || "Click to set delivery address"}
                      </span>
                    </Button>
                  </div>
                </div>
              )}

              <ShippingAddressModal
                open={shippingModalOpen}
                onClose={() => setShippingModalOpen(false)}
                onSave={(address) => {
                  updatePOMutation.mutate({
                    id: poId,
                    shippingAddress: address,
                  });
                }}
                currentAddress={purchaseOrder.shippingAddress || undefined}
              />
            </div>
          </Card>
        </div>

        {/* Product Search */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Add Products</h3>
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by item name or SKU code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedPricelistId} onValueChange={setSelectedPricelistId}>
              <SelectTrigger className="w-[200px]">
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

          {searchQuery && (
            <div className="max-h-[300px] overflow-y-auto border rounded-md">
              {filteredProducts.length > 0 ? (
                <div className="divide-y">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="p-3 hover:bg-accent cursor-pointer flex items-center justify-between"
                      onClick={() => handleAddProduct(product)}
                    >
                      <div className="flex-1">
                        <p className="font-medium">{product.itemName}</p>
                        <p className="text-sm text-muted-foreground">
                          SKU: {product.skuCode || "N/A"} | Buy: ${parseFloat(product.looseBuyPrice).toFixed(2)}
                          {product.packSize && product.packBuyPrice && (
                            <span> | Pack ({product.packSize}): ${parseFloat(product.packBuyPrice).toFixed(2)}</span>
                          )}
                        </p>
                      </div>
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  No products found matching "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Items Table */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Purchase Order Items</h3>
          {purchaseOrder.items && purchaseOrder.items.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Item Name</th>
                    <th className="text-left p-3 font-medium">SKU</th>
                    <th className="text-right p-3 font-medium">Quantity</th>
                    <th className="text-right p-3 font-medium">Buy Price</th>
                    <th className="text-right p-3 font-medium">Total</th>
                    <th className="text-right p-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrder.items.map((item) => {
                    const qty = editingItems[item.id]?.quantity ?? (typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity);
                    const buyPrice = parseFloat(item.buyPrice);
                    const lineTotal = qty * buyPrice;

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
                                [item.id]: { quantity: newQty }
                              }));
                            }}
                            onBlur={() => {
                              const hasChanges = editingItems[item.id]?.quantity !== undefined && 
                                Math.abs(editingItems[item.id]?.quantity - (typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity)) > 0.01;
                              if (hasChanges) {
                                handleUpdateItem(item.id, qty);
                              }
                            }}
                            className="w-24 text-right"
                          />
                        </td>
                        <td className="p-3 text-right">${buyPrice.toFixed(2)}</td>
                        <td className="p-3 text-right font-medium">${lineTotal.toFixed(2)}</td>
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No items added yet. Search and add products above.</p>
            </div>
          )}
        </Card>

        {/* Totals */}
        {purchaseOrder.items && purchaseOrder.items.length > 0 && (
          <div className="flex justify-end">
            <Card className="w-full max-w-md p-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal (ex GST)</span>
                  <span className="font-medium">${calculations.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">GST (10%)</span>
                  <span className="font-medium">${calculations.gst.toFixed(2)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="font-semibold">Total (inc GST)</span>
                  <span className="text-2xl font-bold">${calculations.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
