import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import SuperAdminPanel from "./pages/SuperAdminPanel";
import ContactInbox from "./pages/ContactInbox";
import Pricelists from "./pages/Pricelists";
import PricelistDetail from "./pages/PricelistDetail";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Suppliers from "./pages/Suppliers";
import SupplierDetail from "./pages/SupplierDetail";
import Quotes from "./pages/Quotes";
import QuoteDetail from "./pages/QuoteDetail";
import PurchaseOrders from "./pages/PurchaseOrders";
import PurchaseOrderDetailNew from "./pages/PurchaseOrderDetailNew";
import Settings from "./pages/Settings";
import TeamManagement from "./pages/TeamManagement";
import OrganizationUsers from "./pages/OrganizationUsers";
import Subscribe from "./pages/Subscribe";
import TrialStarted from "./pages/TrialStarted";
import PaymentSuccess from "./pages/PaymentSuccess";
import TrialExpired from "./pages/TrialExpired";
import AdminPanel from "./pages/admin/AdminPanel";
import SupportPage from "./pages/SupportPage";

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
      
{/* Super admin panel — role guard is inside AdminPanel */}
      <Route path="/admin" component={AdminPanel} />
      
      {/* Public landing page */}
      <Route path="/">
        {() => <LandingPage />}
      </Route>

      {/* Signup / billing flows */}
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/trial-started" component={TrialStarted} />
      <Route path="/payment-success" component={PaymentSuccess} />
      <Route path="/trial-expired">
        {() => <ProtectedRoute component={TrialExpired} />}
      </Route>
      
      {/* Protected routes */}
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Home} />}
      </Route>
      <Route path="/admin/super">
        {() => <ProtectedRoute component={SuperAdminPanel} />}
      </Route>
      <Route path="/admin/contacts">
        {() => <ProtectedRoute component={ContactInbox} />}
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
      <Route path="/customers/:id">
        {(params) => <ProtectedRoute component={CustomerDetail} {...params} />}
      </Route>
      <Route path="/suppliers">
        {() => <ProtectedRoute component={Suppliers} />}
      </Route>
      <Route path="/suppliers/:id">
        {(params) => <ProtectedRoute component={SupplierDetail} {...params} />}
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
        {(params) => <ProtectedRoute component={PurchaseOrderDetailNew} {...params} />}
      </Route>
      <Route path="/settings">
        {() => <ProtectedRoute component={Settings} />}
      </Route>
      <Route path="/team">
        {() => <ProtectedRoute component={TeamManagement} />}
      </Route>
      <Route path="/organization/users" component={() => <ProtectedRoute component={OrganizationUsers} />} />
      <Route path="/support">
        {() => <ProtectedRoute component={SupportPage} />}
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
