import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Building2, Mail, Plus, DollarSign, ShoppingCart, Clock } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function SupplierDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const supplierId = parseInt(id || "0");
  
  const { data: supplier, isLoading: supplierLoading } = trpc.suppliers.get.useQuery({ id: supplierId });
  const { data: purchaseOrders, isLoading: posLoading } = trpc.purchaseOrders.listBySupplier.useQuery({ supplierId });
  const utils = trpc.useUtils();
  
  const createPOMutation = trpc.purchaseOrders.create.useMutation({
    onSuccess: (data) => {
      utils.purchaseOrders.listBySupplier.invalidate({ supplierId });
      toast.success("Purchase order created successfully");
      setLocation(`/purchase-orders/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const handleCreatePO = () => {
    createPOMutation.mutate({
      supplierId,
      notes: "",
    });
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "secondary";
      case "sent": return "default";
      case "received": return "default";
      default: return "secondary";
    }
  };
  
  if (supplierLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </DashboardLayout>
    );
  }
  
  if (!supplier) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => setLocation("/suppliers")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Suppliers
          </Button>
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">Supplier not found</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }
  
  // Calculate statistics
  const totalPOs = purchaseOrders?.length || 0;
  const totalSpend = purchaseOrders?.reduce((sum: number, po: any) => sum + parseFloat(po.totalAmount || "0"), 0) || 0;
  const pendingPOs = purchaseOrders?.filter((po: any) => po.status === "draft" || po.status === "sent").length || 0;
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation("/suppliers")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{supplier.companyName}</h1>
              <p className="text-muted-foreground mt-1">Supplier Details</p>
            </div>
          </div>
          <Button onClick={handleCreatePO} disabled={createPOMutation.isPending}>
            <Plus className="mr-2 h-4 w-4" />
            New Purchase Order
          </Button>
        </div>
        
        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Purchase Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPOs}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All time
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalSpend.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all orders
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingPOs}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Draft or sent
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Supplier Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Supplier Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Company Name</p>
                <p className="text-base mt-1">{supplier.companyName}</p>
              </div>
              
              {supplier.keyContactName && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Key Contact</p>
                  <p className="text-base mt-1">{supplier.keyContactName}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">PO Email</p>
                <p className="text-base mt-1 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {supplier.poEmail}
                </p>
              </div>
              
              {supplier.billingAddress && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Billing Address</p>
                  <p className="text-base mt-1 whitespace-pre-line">{supplier.billingAddress}</p>
                </div>
              )}
            </div>
            
            {supplier.notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Notes</p>
                <p className="text-base mt-1 whitespace-pre-line">{supplier.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Purchase Orders List */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Orders</CardTitle>
            <CardDescription>
              All purchase orders for this supplier
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {posLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : purchaseOrders && purchaseOrders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.map((po: any) => (
                    <TableRow 
                      key={po.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setLocation(`/purchase-orders/${po.id}`)}
                    >
                      <TableCell className="font-medium">{po.poNumber}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(po.status)}>
                          {po.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        ${parseFloat(po.totalAmount).toFixed(2)}
                      </TableCell>
                      <TableCell>{new Date(po.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <ShoppingCart className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No purchase orders yet</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={handleCreatePO}
                  disabled={createPOMutation.isPending}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Purchase Order
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
