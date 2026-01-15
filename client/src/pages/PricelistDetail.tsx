import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Upload, Edit, Trash2, Save } from "lucide-react";
import { useState, useRef } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

export default function PricelistDetail() {
  const { id } = useParams<{ id: string }>();
  const pricelistId = parseInt(id || "0");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSellPrice, setEditSellPrice] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: pricelist } = trpc.pricelists.get.useQuery({ id: pricelistId });
  const { data: items, isLoading } = trpc.pricelistItems.list.useQuery({ pricelistId });
  const utils = trpc.useUtils();
  
  const uploadMutation = trpc.pricelistItems.uploadCSV.useMutation({
    onSuccess: (data) => {
      utils.pricelistItems.list.invalidate({ pricelistId });
      setUploadOpen(false);
      toast.success(`Successfully uploaded ${data.itemsCreated} items`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const updateMutation = trpc.pricelistItems.update.useMutation({
    onSuccess: () => {
      utils.pricelistItems.list.invalidate({ pricelistId });
      setEditingId(null);
      toast.success("Item updated successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const deleteMutation = trpc.pricelistItems.delete.useMutation({
    onSuccess: () => {
      utils.pricelistItems.list.invalidate({ pricelistId });
      toast.success("Item deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split("\n").filter(line => line.trim());
    
    if (lines.length < 2) {
      toast.error("CSV file must contain a header row and at least one data row");
      return;
    }

    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    const csvData = lines.slice(1).map(line => {
      const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      return row;
    });

    uploadMutation.mutate({ pricelistId, csvData });
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setEditSellPrice(item.sellPrice);
  };

  const handleSave = (itemId: number) => {
    updateMutation.mutate({ id: itemId, sellPrice: editSellPrice });
  };

  const handleDelete = (itemId: number, itemName: string) => {
    if (confirm(`Are you sure you want to delete "${itemName}"?`)) {
      deleteMutation.mutate({ id: itemId });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/pricelists">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{pricelist?.name || "Pricelist"}</h1>
              <p className="text-muted-foreground mt-2">
                Manage items and pricing for this pricelist
              </p>
            </div>
          </div>
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload CSV
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload CSV Pricelist</DialogTitle>
                <DialogDescription>
                  Upload a CSV file with columns: Item Name, SKU Code, Pack Size, Pack buy price ex gst, Loose buy price ex gst, RRP ex gst, RRP inc gst
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="csv-file">CSV File</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  <p className="text-xs text-muted-foreground">
                    Required: Item Name, Loose buy price ex gst, RRP ex gst
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setUploadOpen(false)}>
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading items...</p>
          </div>
        ) : items && items.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>SKU Code</TableHead>
                    <TableHead>Pack Size</TableHead>
                    <TableHead className="text-right">Buy Price (Loose)</TableHead>
                    <TableHead className="text-right">RRP ex GST</TableHead>
                    <TableHead className="text-right">Sell Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.itemName}</TableCell>
                      <TableCell>{item.skuCode || "-"}</TableCell>
                      <TableCell>{item.packSize || "-"}</TableCell>
                      <TableCell className="text-right">${parseFloat(item.looseBuyPrice).toFixed(2)}</TableCell>
                      <TableCell className="text-right">${parseFloat(item.rrpExGst).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        {editingId === item.id ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editSellPrice}
                            onChange={(e) => setEditSellPrice(e.target.value)}
                            className="w-24 text-right"
                          />
                        ) : (
                          `$${parseFloat(item.sellPrice).toFixed(2)}`
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          {editingId === item.id ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSave(item.id)}
                              disabled={updateMutation.isPending}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDelete(item.id, item.itemName)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No items yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload a CSV file to add items to this pricelist
              </p>
              <Button onClick={() => setUploadOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload CSV
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
