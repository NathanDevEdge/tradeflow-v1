import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  FileDown,
  Trash2,
  Search,
  Mail,
  Plus,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  CheckCircle2,
  Building2,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";

// ── Status helpers ────────────────────────────────────────────────────────────
function statusLabel(status: string) {
  switch (status) {
    case "accepted": return "WON";
    case "declined": return "LOST";
    case "sent":     return "SENT";
    default:         return "DRAFT";
  }
}

function statusClass(status: string) {
  const base = "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold";
  switch (status) {
    case "draft":    return `${base} bg-muted text-muted-foreground`;
    case "sent":     return `${base} bg-amber-50 text-amber-900`;
    case "accepted": return `${base} bg-primary/10 text-primary`;
    default:         return `${base} bg-destructive/10 text-destructive`;
  }
}

export default function QuoteDetail() {
  const [, params] = useRoute("/quotes/:id");
  const [, setLocation] = useLocation();
  const quoteId = params?.id ? parseInt(params.id) : 0;

  // Product search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPricelistId, setSelectedPricelistId] = useState<string>("all");

  // Item editing state
  const [editingItems, setEditingItems] = useState<Record<number, { quantity: number; sellPrice: number }>>({});
  const [priceInputs, setPriceInputs] = useState<Record<number, string>>({});

  // Custom item modal
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customItem, setCustomItem] = useState({ itemName: "", quantity: 1, sellPrice: "", buyPrice: "" });

  // Convert to PO modal
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");

  // Notes / Terms / Expiry / Discount sections
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [termsExpanded, setTermsExpanded] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [internalNotesValue, setInternalNotesValue] = useState("");
  const [termsValue, setTermsValue] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [discountPercent, setDiscountPercent] = useState("0");

  // Invoice tracking
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");

  // Queries
  const { data: quote, isLoading } = trpc.quotes.get.useQuery({ id: quoteId });
  const { data: customer } = trpc.customers.get.useQuery(
    { id: quote?.customerId || 0 },
    { enabled: !!quote?.customerId }
  );
  const { data: allProducts } = trpc.pricelistItems.listAll.useQuery();
  const { data: pricelists } = trpc.pricelists.list.useQuery();
  const { data: suppliers } = trpc.suppliers.list.useQuery();
  const utils = trpc.useUtils();

  // Sync local form state from fetched quote
  useEffect(() => {
    if (quote) {
      setNotesValue((quote as any).notes ?? "");
      setInternalNotesValue((quote as any).internalNotes ?? "");
      setTermsValue((quote as any).terms ?? "");
      setDiscountPercent(parseFloat((quote as any).discountPercent ?? "0").toString());
      const exp = (quote as any).expiresAt;
      if (exp) {
        const d = new Date(exp);
        setExpiresAt(d.toISOString().split("T")[0]);
      }
    }
  }, [quote?.id]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const addItemMutation = trpc.quotes.addItem.useMutation({
    onMutate: async (newItem) => {
      await utils.quotes.get.cancel({ id: quoteId });
      const previousQuote = utils.quotes.get.getData({ id: quoteId });
      if (previousQuote) {
        const isCustom = newItem.type === "custom";
        const optimisticItem = {
          id: Date.now(),
          quoteId,
          pricelistItemId: isCustom ? null : (newItem as any).pricelistItemId,
          itemName: isCustom ? (newItem as any).itemName : "Adding…",
          quantity: newItem.quantity.toFixed(2),
          sellPrice: isCustom ? (newItem as any).sellPrice.toFixed(2) : "0.00",
          buyPrice: isCustom ? (newItem as any).buyPrice.toFixed(2) : "0.00",
          margin: "0.00",
          lineTotal: "0.00",
          skuCode: null,
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
      setCustomModalOpen(false);
      setCustomItem({ itemName: "", quantity: 1, sellPrice: "", buyPrice: "" });
    },
    onError: (error, _, context) => {
      if (context?.previousQuote) utils.quotes.get.setData({ id: quoteId }, context.previousQuote);
      toast.error(error.message);
    },
  });

  const updateItemMutation = trpc.quoteItems.update.useMutation({
    onMutate: async (updated) => {
      await utils.quotes.get.cancel({ id: quoteId });
      const prev = utils.quotes.get.getData({ id: quoteId });
      if (prev?.items) {
        utils.quotes.get.setData({ id: quoteId }, {
          ...prev,
          items: prev.items.map(item => {
            if (item.id !== updated.id) return item;
            const qty = updated.quantity ?? parseFloat(item.quantity);
            const sp = updated.sellPrice ?? parseFloat(item.sellPrice);
            const bp = parseFloat(item.buyPrice);
            return {
              ...item,
              quantity: qty.toFixed(2),
              sellPrice: sp.toFixed(2),
              lineTotal: (qty * sp).toFixed(2),
              margin: ((sp - bp) * qty).toFixed(2),
            };
          }),
        });
      }
      return { prev };
    },
    onSuccess: () => utils.quotes.get.invalidate({ id: quoteId }),
    onError: (err, _, ctx) => {
      if (ctx?.prev) utils.quotes.get.setData({ id: quoteId }, ctx.prev);
      toast.error(err.message);
    },
  });

  const deleteItemMutation = trpc.quoteItems.delete.useMutation({
    onMutate: async (deleted) => {
      await utils.quotes.get.cancel({ id: quoteId });
      const prev = utils.quotes.get.getData({ id: quoteId });
      if (prev?.items) {
        utils.quotes.get.setData({ id: quoteId }, {
          ...prev,
          items: prev.items.filter(i => i.id !== deleted.id),
        });
      }
      return { prev };
    },
    onSuccess: () => utils.quotes.get.invalidate({ id: quoteId }),
    onError: (err, _, ctx) => {
      if (ctx?.prev) utils.quotes.get.setData({ id: quoteId }, ctx.prev);
      toast.error(err.message);
    },
  });

  const generatePDFMutation = trpc.quotes.generatePDF.useMutation({
    onSuccess: (data) => {
      if (data.url) { window.open(data.url, "_blank"); toast.success("PDF generated"); }
    },
    onError: (err) => toast.error(err.message),
  });

  const emailMutation = trpc.quotes.emailToCustomer.useMutation({
    onSuccess: () => {
      utils.quotes.get.invalidate({ id: quoteId });
      toast.success(`Quote emailed to ${customer?.email}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateStatusMutation = trpc.quotes.update.useMutation({
    onSuccess: () => {
      utils.quotes.get.invalidate({ id: quoteId });
      toast.success("Quote updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const convertMutation = trpc.quotes.convertToPO.useMutation({
    onSuccess: (data) => {
      toast.success("Purchase order created");
      setConvertModalOpen(false);
      setLocation(`/purchase-orders/${data.poId}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const markInvoicedMutation = trpc.quotes.markInvoiced.useMutation({
    onSuccess: () => {
      utils.quotes.get.invalidate({ id: quoteId });
      setInvoiceModalOpen(false);
      setInvoiceNumber("");
      toast.success("Marked as invoiced");
    },
    onError: (err) => toast.error(err.message),
  });

  const markPaidMutation = trpc.quotes.markPaid.useMutation({
    onSuccess: () => {
      utils.quotes.get.invalidate({ id: quoteId });
      toast.success("Marked as paid");
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────

  const filteredProducts = useMemo(() => {
    if (!allProducts) return [];
    let filtered = allProducts;
    if (selectedPricelistId !== "all") {
      filtered = filtered.filter(p => p.pricelistId === parseInt(selectedPricelistId));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.itemName.toLowerCase().includes(q) || (p.skuCode && p.skuCode.toLowerCase().includes(q))
      );
    }
    return filtered.slice(0, 50); // increased from 10
  }, [allProducts, searchQuery, selectedPricelistId]);

  const handleAddFromPricelist = (product: any) => {
    addItemMutation.mutate({
      type: "pricelist",
      quoteId,
      pricelistItemId: product.id,
      quantity: 1,
    });
  };

  const handleAddCustomItem = () => {
    const sp = parseFloat(customItem.sellPrice) || 0;
    const bp = parseFloat(customItem.buyPrice) || 0;
    if (!customItem.itemName.trim()) { toast.error("Item name is required"); return; }
    if (sp <= 0) { toast.error("Sell price must be greater than 0"); return; }
    addItemMutation.mutate({
      type: "custom",
      quoteId,
      itemName: customItem.itemName,
      quantity: customItem.quantity,
      sellPrice: sp,
      buyPrice: bp,
    });
  };

  const handleUpdateItem = (itemId: number, quantity: number, sellPrice: number) => {
    updateItemMutation.mutate({ id: itemId, quantity, sellPrice });
    setEditingItems(prev => { const s = { ...prev }; delete s[itemId]; return s; });
  };

  const handleDeleteItem = (itemId: number) => {
    if (confirm("Remove this item?")) deleteItemMutation.mutate({ id: itemId });
  };

  const handleSaveNotes = () => {
    updateStatusMutation.mutate({
      id: quoteId,
      notes: notesValue,
      internalNotes: internalNotesValue,
    });
  };

  const handleSaveTerms = () => {
    updateStatusMutation.mutate({ id: quoteId, terms: termsValue });
  };

  const handleSaveExpiry = () => {
    updateStatusMutation.mutate({ id: quoteId, expiresAt });
  };

  const handleSaveDiscount = () => {
    updateStatusMutation.mutate({ id: quoteId, discountPercent: parseFloat(discountPercent) || 0 });
    utils.quotes.get.invalidate({ id: quoteId });
  };

  const handleEmailQuote = () => {
    if (!quote?.pdfUrl) {
      toast.error("Please generate the PDF first before emailing");
      return;
    }
    if (!customer?.email) {
      toast.error("This customer has no email address on record");
      return;
    }
    emailMutation.mutate({ id: quoteId });
  };

  // Sync editingItems when quote items change
  useEffect(() => {
    if (quote?.items) {
      const s: Record<number, { quantity: number; sellPrice: number }> = {};
      quote.items.forEach(item => {
        s[item.id] = {
          quantity: typeof item.quantity === "string" ? parseFloat(item.quantity) : item.quantity,
          sellPrice: parseFloat(item.sellPrice),
        };
      });
      setEditingItems(s);
    }
  }, [quote?.items]);

  // ── Calculations ──────────────────────────────────────────────────────────
  const calculations = useMemo(() => {
    if (!quote?.items) return { subtotal: 0, totalMargin: 0, marginPercent: 0, discount: 0, discountedSubtotal: 0, gst: 0, total: 0 };

    const subtotal = quote.items.reduce((sum, item) => {
      const qty = editingItems[item.id]?.quantity ?? parseFloat(item.quantity as string);
      const price = editingItems[item.id]?.sellPrice ?? parseFloat(item.sellPrice);
      return sum + qty * price;
    }, 0);

    const totalCost = quote.items.reduce((sum, item) => {
      const qty = editingItems[item.id]?.quantity ?? parseFloat(item.quantity as string);
      return sum + qty * parseFloat(item.buyPrice);
    }, 0);

    const disc = parseFloat(discountPercent) || parseFloat((quote as any).discountPercent ?? "0") || 0;
    const discount = subtotal * (disc / 100);
    const discountedSubtotal = subtotal - discount;
    const totalMargin = discountedSubtotal - totalCost;
    const marginPercent = discountedSubtotal > 0 ? (totalMargin / discountedSubtotal) * 100 : 0;
    const gst = discountedSubtotal * 0.1;
    const total = discountedSubtotal + gst;

    return { subtotal, totalMargin, marginPercent, discount, discountedSubtotal, gst, total };
  }, [quote?.items, editingItems, discountPercent]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const sentAt = (quote as any)?.sentAt;
  const invoicedAt = (quote as any)?.invoicedAt;
  const paidAt = (quote as any)?.paidAt;
  const invoiceNum = (quote as any)?.invoiceNumber;
  const expiresAtStored = (quote as any)?.expiresAt;
  const isExpired = expiresAtStored && new Date(expiresAtStored) < new Date();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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
            <ArrowLeft className="mr-2 h-4 w-4" />Back to Quotes
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLocation("/quotes")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-semibold">{quote.quoteNumber}</h1>
              <span className="text-muted-foreground text-sm">·</span>
              <span className="text-sm text-muted-foreground">{customer?.companyName || "…"}</span>
              {expiresAtStored && (
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isExpired ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                  {isExpired ? "Expired" : `Valid until ${new Date(expiresAtStored).toLocaleDateString("en-AU")}`}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status workflow */}
            {quote.status === "draft" && (
              <Button
                onClick={() => updateStatusMutation.mutate({ id: quoteId, status: "sent" })}
                disabled={updateStatusMutation.isPending}
                variant="outline"
                size="sm"
              >
                Mark as Sent
              </Button>
            )}
            {quote.status === "sent" && (
              <>
                <Button
                  onClick={() => updateStatusMutation.mutate({ id: quoteId, status: "accepted" })}
                  disabled={updateStatusMutation.isPending}
                  size="sm"
                >
                  Mark as Won
                </Button>
                <Button
                  onClick={() => updateStatusMutation.mutate({ id: quoteId, status: "declined" })}
                  disabled={updateStatusMutation.isPending}
                  variant="destructive"
                  size="sm"
                >
                  Mark as Lost
                </Button>
              </>
            )}

            <span className={statusClass(quote.status)}>{statusLabel(quote.status)}</span>

            {/* Email button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleEmailQuote}
              disabled={emailMutation.isPending || !customer?.email}
              title={!customer?.email ? "Customer has no email address" : sentAt ? `Last emailed ${new Date(sentAt).toLocaleDateString("en-AU")}` : "Email quote to customer"}
            >
              <Mail className="mr-1.5 h-4 w-4" />
              {emailMutation.isPending ? "Sending…" : sentAt ? "Resend Quote" : "Email Quote"}
            </Button>

            {/* PDF */}
            <Button size="sm" onClick={() => generatePDFMutation.mutate({ id: quoteId })} disabled={generatePDFMutation.isPending}>
              <FileDown className="mr-1.5 h-4 w-4" />
              {generatePDFMutation.isPending ? "Generating…" : "Export PDF"}
            </Button>

            {/* Convert to PO (won quotes only) */}
            {quote.status === "accepted" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConvertModalOpen(true)}
              >
                <ArrowRight className="mr-1.5 h-4 w-4" />
                Convert to PO
              </Button>
            )}
          </div>
        </div>

        {/* ── Line Items Card ── */}
        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Product search */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by item name or SKU…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedPricelistId} onValueChange={setSelectedPricelistId}>
                <SelectTrigger><SelectValue placeholder="All Pricelists" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Pricelists</SelectItem>
                  {pricelists?.map(pl => (
                    <SelectItem key={pl.id} value={pl.id.toString()}>{pl.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search results dropdown */}
            {searchQuery && (
              <div className="border rounded-lg p-2 max-h-60 overflow-y-auto space-y-1">
                {filteredProducts.length > 0 ? filteredProducts.map((product: any) => (
                  <button
                    key={product.id}
                    onClick={() => handleAddFromPricelist(product)}
                    className="w-full text-left px-3 py-2 hover:bg-muted rounded-md transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-sm">{product.itemName}</div>
                      {product.skuCode && <div className="text-xs text-muted-foreground">{product.skuCode}</div>}
                    </div>
                    <div className="text-sm font-medium">
                      ${parseFloat(product.sellPrice || product.rrpExGst || "0").toFixed(2)}
                    </div>
                  </button>
                )) : (
                  <p className="text-sm text-muted-foreground text-center py-3">No products match "{searchQuery}"</p>
                )}
                {filteredProducts.length === 50 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">Showing top 50 — refine your search for more</p>
                )}
              </div>
            )}

            {/* Add custom item button */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCustomModalOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add custom item
              </Button>
              <span className="text-xs text-muted-foreground">or search your price list above</span>
            </div>

            {/* Items table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium text-sm">Item</th>
                    <th className="text-left p-3 font-medium text-sm">SKU</th>
                    <th className="text-right p-3 font-medium text-sm">Qty</th>
                    <th className="text-right p-3 font-medium text-sm">Unit Price</th>
                    <th className="text-right p-3 font-medium text-sm">Margin/Unit</th>
                    <th className="text-right p-3 font-medium text-sm">Margin %</th>
                    <th className="text-right p-3 font-medium text-sm">Total</th>
                    <th className="text-right p-3 font-medium text-sm"></th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items && quote.items.length > 0 ? (
                    quote.items.map((item) => {
                      const qty = editingItems[item.id]?.quantity ?? parseFloat(item.quantity as string);
                      const sp = editingItems[item.id]?.sellPrice ?? parseFloat(item.sellPrice);
                      const bp = parseFloat(item.buyPrice);
                      const lineTotal = qty * sp;
                      const marginPerUnit = sp - bp;
                      const marginPct = sp > 0 ? (marginPerUnit / sp) * 100 : 0;
                      const hasChanges =
                        Math.abs(qty - parseFloat(item.quantity as string)) > 0.001 ||
                        Math.abs(sp - parseFloat(item.sellPrice)) > 0.001;

                      return (
                        <tr key={item.id} className="border-t">
                          <td className="p-3 text-sm">{item.itemName}</td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {(item as any).skuCode ?? (item.pricelistItemId ? null : <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Custom</span>)}
                          </td>
                          <td className="p-3">
                            <Input
                              type="number"
                              min="0.01"
                              step="1"
                              value={qty}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value) || 1;
                                setEditingItems(prev => ({ ...prev, [item.id]: { quantity: v, sellPrice: prev[item.id]?.sellPrice ?? sp } }));
                              }}
                              onBlur={() => { if (hasChanges) handleUpdateItem(item.id, qty, sp); }}
                              className="w-20 text-right"
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-muted-foreground text-sm">$</span>
                              <Input
                                type="text"
                                inputMode="decimal"
                                value={priceInputs[item.id] ?? sp.toFixed(2)}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (v === "" || /^\d*\.?\d*$/.test(v)) {
                                    setPriceInputs(prev => ({ ...prev, [item.id]: v }));
                                    setEditingItems(prev => ({ ...prev, [item.id]: { quantity: prev[item.id]?.quantity ?? qty, sellPrice: parseFloat(v) || 0 } }));
                                  }
                                }}
                                onFocus={(e) => e.target.select()}
                                onBlur={() => {
                                  setPriceInputs(prev => ({ ...prev, [item.id]: sp.toFixed(2) }));
                                  if (hasChanges) handleUpdateItem(item.id, qty, sp);
                                }}
                                className="w-24 text-right"
                              />
                            </div>
                          </td>
                          <td className="p-3 text-right text-primary font-medium text-sm">${marginPerUnit.toFixed(2)}</td>
                          <td className="p-3 text-right text-primary font-medium text-sm">{marginPct.toFixed(1)}%</td>
                          <td className="p-3 text-right font-medium text-sm">${lineTotal.toFixed(2)}</td>
                          <td className="p-3 text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(item.id)} disabled={deleteItemMutation.isPending}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-muted-foreground text-sm">
                        No items yet — search for products above or add a custom item.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            {quote.items && quote.items.length > 0 && (
              <div className="flex flex-col md:flex-row md:justify-between gap-6">
                {/* Discount input */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground whitespace-nowrap">Quote Discount %</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                      onBlur={handleSaveDiscount}
                      className="w-20 text-right"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>

                <div className="w-full md:w-80 space-y-2 border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal (ex GST)</span>
                    <span className="font-medium tabular-nums">${calculations.subtotal.toFixed(2)}</span>
                  </div>
                  {calculations.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discount ({discountPercent}%)</span>
                      <span className="font-medium tabular-nums text-destructive">-${calculations.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Margin</span>
                    <span className="font-medium tabular-nums text-primary">
                      ${calculations.totalMargin.toFixed(2)} ({calculations.marginPercent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">GST (10%)</span>
                    <span className="font-medium tabular-nums">${calculations.gst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>Total (inc GST)</span>
                    <span className="text-xl tabular-nums">${calculations.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Notes & Terms Card ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Notes & Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Expiry date */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Valid Until (Expiry)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    onBlur={handleSaveExpiry}
                    className="w-44"
                  />
                  {expiresAt && (
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-8" onClick={() => { setExpiresAt(""); updateStatusMutation.mutate({ id: quoteId, expiresAt: "" }); }}>
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Customer notes */}
            <div>
              <button
                type="button"
                className="flex items-center gap-2 text-sm font-medium mb-2 w-full text-left"
                onClick={() => setNotesExpanded(v => !v)}
              >
                {notesExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Customer Notes
                <span className="text-xs text-muted-foreground font-normal">(shown on PDF)</span>
              </button>
              {notesExpanded && (
                <div className="space-y-2">
                  <Textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    onBlur={handleSaveNotes}
                    placeholder="Add notes for the customer — these will appear on the quote PDF…"
                    rows={3}
                  />
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Internal Notes (not shown to customer)</Label>
                    <Textarea
                      value={internalNotesValue}
                      onChange={(e) => setInternalNotesValue(e.target.value)}
                      onBlur={handleSaveNotes}
                      placeholder="Private notes for your team — never printed on the PDF…"
                      rows={2}
                      className="bg-amber-50/50 border-amber-200"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Terms & Conditions */}
            <div>
              <button
                type="button"
                className="flex items-center gap-2 text-sm font-medium mb-2 w-full text-left"
                onClick={() => setTermsExpanded(v => !v)}
              >
                {termsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Terms & Conditions
                <span className="text-xs text-muted-foreground font-normal">(shown on PDF)</span>
              </button>
              {termsExpanded && (
                <Textarea
                  value={termsValue}
                  onChange={(e) => setTermsValue(e.target.value)}
                  onBlur={handleSaveTerms}
                  placeholder="Add any terms and conditions — e.g. payment terms, delivery conditions…"
                  rows={4}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Invoice Tracking (accepted quotes only) ── */}
        {quote.status === "accepted" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Payment Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 flex-wrap">
                {/* Step 1: Invoiced */}
                <div className={`flex items-center gap-2 ${invoicedAt ? "text-foreground" : "text-muted-foreground"}`}>
                  <CheckCircle2 className={`h-5 w-5 ${invoicedAt ? "text-primary" : "text-muted-foreground/40"}`} />
                  <div>
                    <p className="text-sm font-medium">Invoiced</p>
                    {invoicedAt ? (
                      <p className="text-xs text-muted-foreground">
                        {invoiceNum && <span className="font-medium">{invoiceNum} · </span>}
                        {new Date(invoicedAt).toLocaleDateString("en-AU")}
                      </p>
                    ) : (
                      <Button variant="outline" size="sm" className="mt-1 h-7 text-xs" onClick={() => setInvoiceModalOpen(true)}>
                        Mark as Invoiced
                      </Button>
                    )}
                  </div>
                </div>

                {invoicedAt && (
                  <>
                    <span className="text-muted-foreground/30 text-lg">→</span>
                    {/* Step 2: Paid */}
                    <div className={`flex items-center gap-2 ${paidAt ? "text-foreground" : "text-muted-foreground"}`}>
                      <CheckCircle2 className={`h-5 w-5 ${paidAt ? "text-primary" : "text-muted-foreground/40"}`} />
                      <div>
                        <p className="text-sm font-medium">Paid</p>
                        {paidAt ? (
                          <p className="text-xs text-muted-foreground">{new Date(paidAt).toLocaleDateString("en-AU")}</p>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-1 h-7 text-xs"
                            onClick={() => markPaidMutation.mutate({ id: quoteId })}
                            disabled={markPaidMutation.isPending}
                          >
                            Mark as Paid
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Custom Item Modal ── */}
      <Dialog open={customModalOpen} onOpenChange={setCustomModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Item</DialogTitle>
            <DialogDescription>Enter the details for a one-off item not in your price list.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Item Description *</Label>
              <Input
                value={customItem.itemName}
                onChange={(e) => setCustomItem(p => ({ ...p, itemName: e.target.value }))}
                placeholder="e.g. Labour — 2hrs installation"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Qty</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="1"
                  value={customItem.quantity}
                  onChange={(e) => setCustomItem(p => ({ ...p, quantity: parseFloat(e.target.value) || 1 }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sell Price ($) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={customItem.sellPrice}
                  onChange={(e) => setCustomItem(p => ({ ...p, sellPrice: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cost Price ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={customItem.buyPrice}
                  onChange={(e) => setCustomItem(p => ({ ...p, buyPrice: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCustomItem} disabled={addItemMutation.isPending}>
              {addItemMutation.isPending ? "Adding…" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Convert to PO Modal ── */}
      <Dialog open={convertModalOpen} onOpenChange={setConvertModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Purchase Order</DialogTitle>
            <DialogDescription>
              This will create a draft PO with all line items from this quote (at buy prices). Select a supplier to send it to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Supplier *</Label>
            <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a supplier…" />
              </SelectTrigger>
              <SelectContent>
                {suppliers?.map(s => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      {s.companyName}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!selectedSupplierId) { toast.error("Please select a supplier"); return; }
                convertMutation.mutate({ quoteId, supplierId: parseInt(selectedSupplierId) });
              }}
              disabled={convertMutation.isPending}
            >
              {convertMutation.isPending ? "Creating PO…" : "Create Purchase Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Mark Invoiced Modal ── */}
      <Dialog open={invoiceModalOpen} onOpenChange={setInvoiceModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Invoiced</DialogTitle>
            <DialogDescription>
              Optionally enter your invoice number from your accounting software (e.g. Xero).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Invoice Number (optional)</Label>
            <Input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="e.g. INV-0042"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => markInvoicedMutation.mutate({ id: quoteId, invoiceNumber })}
              disabled={markInvoicedMutation.isPending}
            >
              {markInvoicedMutation.isPending ? "Saving…" : "Mark as Invoiced"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
