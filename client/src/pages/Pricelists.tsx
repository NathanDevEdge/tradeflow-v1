import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
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
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b">
          <h1 className="text-base font-semibold">Pricelists</h1>
          {!isLoading && pricelists && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {pricelists.length}
            </span>
          )}
          <div className="flex-1" />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
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
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" role="status" aria-label="Loading…" />
          </div>
        ) : pricelists && pricelists.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pricelists.map((pricelist) => (
              <Link key={pricelist.id} href={`/pricelists/${pricelist.id}`}>
                <div className="group border rounded-lg p-4 hover:border-primary/40 hover:bg-muted/30 transition-all cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground/30 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity -mr-1"
                      onClick={(e) => { e.preventDefault(); handleDelete(pricelist.id, pricelist.name); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-sm font-medium">{pricelist.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(pricelist.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium mb-1">No pricelists yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              Create your first pricelist to get started
            </p>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Pricelist
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
