import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";

interface ShippingAddressModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (address: string) => void;
  currentAddress?: string;
}

export function ShippingAddressModal({ open, onClose, onSave, currentAddress }: ShippingAddressModalProps) {
  const [mode, setMode] = useState<"select" | "new">("select");
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    attentionTo: "",
    streetAddress: "",
    state: "",
    postcode: "",
    country: "Australia",
    phoneNumber: "",
  });

  const { data: savedAddresses, isLoading } = trpc.shippingAddresses.list.useQuery();
  const createMutation = trpc.shippingAddresses.create.useMutation();

  useEffect(() => {
    if (currentAddress && savedAddresses) {
      // Try to match current address with saved addresses
      const match = savedAddresses.find(addr => 
        formatAddress(addr) === currentAddress
      );
      if (match) {
        setSelectedAddressId(match.id);
        setMode("select");
      } else {
        setMode("new");
        // Parse current address if it exists
        const lines = currentAddress.split("\n");
        if (lines.length > 0) {
          setFormData(prev => ({ ...prev, streetAddress: lines[0] }));
        }
      }
    }
  }, [currentAddress, savedAddresses]);

  const formatAddress = (addr: any) => {
    const parts = [];
    if (addr.attentionTo) parts.push(`Attn: ${addr.attentionTo}`);
    parts.push(addr.streetAddress);
    if (addr.state || addr.postcode) {
      parts.push(`${addr.state || ""} ${addr.postcode || ""}`.trim());
    }
    if (addr.country && addr.country !== "Australia") parts.push(addr.country);
    if (addr.phoneNumber) parts.push(`Ph: ${addr.phoneNumber}`);
    return parts.join("\n");
  };

  const handleSave = async () => {
    if (mode === "select" && selectedAddressId) {
      const selected = savedAddresses?.find(a => a.id === selectedAddressId);
      if (selected) {
        onSave(formatAddress(selected));
        onClose();
      }
    } else if (mode === "new") {
      try {
        const created = await createMutation.mutateAsync(formData);
        onSave(formatAddress(created));
        onClose();
      } catch (error) {
        console.error("Failed to save address:", error);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Shipping Address</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode selector */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "select" ? "default" : "outline"}
              onClick={() => setMode("select")}
              disabled={!savedAddresses || savedAddresses.length === 0}
            >
              Select Saved Address
            </Button>
            <Button
              type="button"
              variant={mode === "new" ? "default" : "outline"}
              onClick={() => setMode("new")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Address
            </Button>
          </div>

          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Select mode */}
          {mode === "select" && !isLoading && savedAddresses && savedAddresses.length > 0 && (
            <div className="space-y-2">
              <Label>Select Address</Label>
              <Select
                value={selectedAddressId?.toString() || ""}
                onValueChange={(value) => setSelectedAddressId(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a saved address" />
                </SelectTrigger>
                <SelectContent>
                  {savedAddresses.map((addr) => (
                    <SelectItem key={addr.id} value={addr.id.toString()}>
                      <div className="text-sm">
                        {addr.attentionTo && <div className="font-medium">{addr.attentionTo}</div>}
                        <div>{addr.streetAddress}</div>
                        <div className="text-muted-foreground">
                          {addr.state} {addr.postcode}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* New address form */}
          {mode === "new" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="attentionTo">Attention To (Optional)</Label>
                <Input
                  id="attentionTo"
                  value={formData.attentionTo}
                  onChange={(e) => setFormData(prev => ({ ...prev, attentionTo: e.target.value }))}
                  placeholder="Person or department name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="streetAddress">Street Address *</Label>
                <Input
                  id="streetAddress"
                  value={formData.streetAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, streetAddress: e.target.value }))}
                  placeholder="123 Main Street"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="VIC"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postcode">Postcode</Label>
                  <Input
                    id="postcode"
                    value={formData.postcode}
                    onChange={(e) => setFormData(prev => ({ ...prev, postcode: e.target.value }))}
                    placeholder="3000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  placeholder="Australia"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  placeholder="(03) 1234 5678"
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={
                (mode === "select" && !selectedAddressId) ||
                (mode === "new" && !formData.streetAddress) ||
                createMutation.isPending
              }
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Address
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
