import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchableSelect } from "@/components/SearchableSelect";
import { trpc } from "@/lib/trpc";
import { Plus, FileText, Eye, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Quotes() {
  const [open, setOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<number | null>(null);
  const [, setLocation] = useLocation();
  
  const { data: quotes, isLoading } = trpc.quotes.list.useQuery();
  const { data: customers } = trpc.customers.list.useQuery();
  const utils = trpc.useUtils();
  
  const createMutation = trpc.quotes.create.useMutation({
    onSuccess: (data) => {
      utils.quotes.list.invalidate();
      setOpen(false);
      resetForm();
      toast.success("Quote created successfully");
      // Redirect to quote detail page
      setLocation(`/quotes/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.quotes.delete.useMutation({
    onSuccess: () => {
      utils.quotes.list.invalidate();
      setDeleteDialogOpen(false);
      setQuoteToDelete(null);
      toast.success("Quote deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleDelete = () => {
    if (quoteToDelete) {
      deleteMutation.mutate({ id: quoteToDelete });
    }
  };

  const resetForm = () => {
    setSelectedCustomerId("");
    setNotes("");
  };

  const handleCreate = () => {
    if (!selectedCustomerId) {
      toast.error("Please select a customer");
      return;
    }
    createMutation.mutate({ 
      customerId: parseInt(selectedCustomerId),
      notes: notes || undefined,
    });
  };

  const getCustomerName = (customerId: number) => {
    const customer = customers?.find(c => c.id === customerId);
    return customer?.companyName || "Unknown Customer";
  };

  const getStatusClass = (status: string) => {
    const base = "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium";
    switch (status) {
      case "draft":    return `${base} bg-muted text-muted-foreground`;
      case "sent":     return `${base} bg-amber-50 text-amber-900`;
      case "accepted": return `${base} bg-primary/10 text-primary`;
      case "declined": return `${base} bg-destructive/10 text-destructive`;
      default:         return `${base} bg-muted text-muted-foreground`;
    }
  };

  // Filter quotes based on search query
  const filteredQuotes = quotes?.filter(quote => {
    if (!searchQuery) return true;
    const customerName = getCustomerName(quote.customerId).toLowerCase();
    const quoteNumber = quote.quoteNumber.toLowerCase();
    const search = searchQuery.toLowerCase();
    return customerName.includes(search) || quoteNumber.includes(search);
  });

  const customerOptions = customers?.map(customer => ({
    value: customer.id.toString(),
    label: customer.companyName,
  })) || [];

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b">
          <h1 className="text-base font-semibold">Quotes</h1>
          {!isLoading && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {filteredQuotes?.length ?? 0}
            </span>
          )}
          <div className="flex-1" />
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm w-52"
            />
          </div>
          <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New Quote
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Quote</DialogTitle>
                <DialogDescription>
                  Select a customer to create a new quote
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer *</Label>
                  <SearchableSelect
                    options={customerOptions}
                    value={selectedCustomerId}
                    onValueChange={setSelectedCustomerId}
                    placeholder="Search for a customer..."
                    searchPlaceholder="Search customers..."
                    emptyText="No customers found."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any notes for this quote..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Quote"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" role="status" aria-label="Loading…" />
          </div>
        ) : filteredQuotes && filteredQuotes.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>Quote #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotes.map((quote) => (
                    <TableRow 
                      key={quote.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setLocation(`/quotes/${quote.id}`)}
                    >
                      <TableCell className="font-medium">{quote.quoteNumber}</TableCell>
                      <TableCell>{getCustomerName(quote.customerId)}</TableCell>
                      <TableCell>
                        <span className={getStatusClass(quote.status)}>
                          {quote.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        ${parseFloat(quote.totalAmount || "0").toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className="text-primary font-medium">
                          ${parseFloat(quote.totalMargin || "0").toFixed(2)} ({quote.marginPercentage || "0"}%)
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(quote.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocation(`/quotes/${quote.id}`);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuoteToDelete(quote.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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
            <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium mb-1">
              {searchQuery ? "No quotes match your search" : "No quotes yet"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {searchQuery ? "Try a different search term" : "Create your first quote to get started"}
            </p>
            {!searchQuery && (
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New Quote
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Quote</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this quote? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
