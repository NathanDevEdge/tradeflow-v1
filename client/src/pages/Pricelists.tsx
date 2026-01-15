import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Plus, FileText, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Pricelists() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  
  const { data: pricelists, isLoading } = trpc.pricelists.list.useQuery();
  const utils = trpc.useUtils();
  
  const createMutation = trpc.pricelists.create.useMutation({
    onSuccess: () => {
      utils.pricelists.list.invalidate();
      setOpen(false);
      setName("");
      toast.success("Pricelist created successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const deleteMutation = trpc.pricelists.delete.useMutation({
    onSuccess: () => {
      utils.pricelists.list.invalidate();
      toast.success("Pricelist deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Please enter a pricelist name");
      return;
    }
    createMutation.mutate({ name: name.trim() });
  };

  const handleDelete = (id: number, pricelistName: string) => {
    if (confirm(`Are you sure you want to delete "${pricelistName}"? This will also delete all items in this pricelist.`)) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pricelists</h1>
            <p className="text-muted-foreground mt-2">
              Manage your product pricelists and upload CSV files
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Pricelist
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Pricelist</DialogTitle>
                <DialogDescription>
                  Enter a name for your pricelist. You can upload CSV items after creation.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Pricelist Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., WoodEvo Pricelist"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCreate();
                      }
                    }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
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
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading pricelists...</p>
          </div>
        ) : pricelists && pricelists.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pricelists.map((pricelist) => (
              <Card key={pricelist.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <FileText className="h-8 w-8 text-primary" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(pricelist.id, pricelist.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardTitle className="mt-4">{pricelist.name}</CardTitle>
                  <CardDescription>
                    Created {new Date(pricelist.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={`/pricelists/${pricelist.id}`}>
                    <Button variant="outline" className="w-full">
                      View Items
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No pricelists yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first pricelist to get started
              </p>
              <Button onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Pricelist
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
