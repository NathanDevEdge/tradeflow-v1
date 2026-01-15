import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Pricelists from "./pages/Pricelists";
import PricelistDetail from "./pages/PricelistDetail";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import Quotes from "./pages/Quotes";
import QuoteDetail from "./pages/QuoteDetail";
import PurchaseOrders from "./pages/PurchaseOrders";
import PurchaseOrderDetail from "./pages/PurchaseOrderDetail";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/pricelists"} component={Pricelists} />
      <Route path={"/pricelists/:id"} component={PricelistDetail} />
      <Route path={"/customers"} component={Customers} />
      <Route path={"/suppliers"} component={Suppliers} />
      <Route path={"/quotes"} component={Quotes} />
      <Route path={"/quotes/:id"} component={QuoteDetail} />
      <Route path={"/purchase-orders"} component={PurchaseOrders} />
      <Route path={"/purchase-orders/:id"} component={PurchaseOrderDetail} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
