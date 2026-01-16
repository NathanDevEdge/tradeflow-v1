import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Pricelists from "./pages/Pricelists";
import PricelistDetail from "./pages/PricelistDetail";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import Quotes from "./pages/Quotes";
import QuoteDetail from "./pages/QuoteDetail";
import PurchaseOrders from "./pages/PurchaseOrders";
import PurchaseOrderDetail from "./pages/PurchaseOrderDetail";

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      {/* Public authentication routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      
      {/* Protected routes */}
      <Route path="/">
        {() => <ProtectedRoute component={Home} />}
      </Route>
      <Route path="/pricelists">
        {() => <ProtectedRoute component={Pricelists} />}
      </Route>
      <Route path="/pricelists/:id">
        {(params) => <ProtectedRoute component={PricelistDetail} {...params} />}
      </Route>
      <Route path="/customers">
        {() => <ProtectedRoute component={Customers} />}
      </Route>
      <Route path="/suppliers">
        {() => <ProtectedRoute component={Suppliers} />}
      </Route>
      <Route path="/quotes">
        {() => <ProtectedRoute component={Quotes} />}
      </Route>
      <Route path="/quotes/:id">
        {(params) => <ProtectedRoute component={QuoteDetail} {...params} />}
      </Route>
      <Route path="/purchase-orders">
        {() => <ProtectedRoute component={PurchaseOrders} />}
      </Route>
      <Route path="/purchase-orders/:id">
        {(params) => <ProtectedRoute component={PurchaseOrderDetail} {...params} />}
      </Route>
      <Route path="/404" component={NotFound} />
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
