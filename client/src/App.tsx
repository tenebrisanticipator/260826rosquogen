import { useAuth } from "@/_core/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import AdminPage from "@/pages/AdminPage";
import Dashboard from "@/pages/Dashboard";
import LoginPage from "@/pages/LoginPage";
import UserHome from "@/pages/UserHome";
import NotFound from "@/pages/NotFound";
import QuotationDetail from "@/pages/QuotationDetail";
import QuotationForm from "@/pages/QuotationForm";
import Quotations from "@/pages/Quotations";
import { homePathForRole } from "@shared/access";
import { useEffect, type ReactNode } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function LoadingGate() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50">
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-sky-200 border-t-sky-700" />
    </div>
  );
}

function isSignedInUser(
  user: ReturnType<typeof useAuth>["user"]
): user is NonNullable<ReturnType<typeof useAuth>["user"]> {
  return Boolean(user?.id && (user.role === "admin" || user.role === "user"));
}

function LoginEntry() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && isSignedInUser(user)) {
      setLocation(homePathForRole(user.role));
    }
  }, [loading, setLocation, user]);

  if (loading || isSignedInUser(user)) return <LoadingGate />;
  return <LoginPage />;
}

function AdminOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && isSignedInUser(user) && user.role !== "admin") {
      setLocation("/home");
    }
  }, [loading, setLocation, user]);

  if (loading || !isSignedInUser(user) || user.role !== "admin") return <LoadingGate />;
  return <>{children}</>;
}

function UserOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && user?.role === "admin") {
      setLocation("/admin/dashboard");
    }
  }, [loading, setLocation, user]);

  if (loading || !isSignedInUser(user) || user.role === "admin") return <LoadingGate />;
  return <>{children}</>;
}

function Workspace() {
  const { user, loading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!isSignedInUser(user)) {
      setLocation("/login");
    }
  }, [loading, location, setLocation, user]);

  if (loading || !isSignedInUser(user)) return <LoadingGate />;

  return (
    <DashboardLayout>
      <Switch>
        <Route path="/home">
          <UserOnly>
            <UserHome />
          </UserOnly>
        </Route>
        <Route path="/quotations/new" component={QuotationForm} />
        <Route path="/quotations/:id/edit" component={QuotationForm} />
        <Route path="/quotations/:id" component={QuotationDetail} />
        <Route path="/quotations" component={Quotations} />
        <Route path="/admin/dashboard">
          <AdminOnly>
            <Dashboard />
          </AdminOnly>
        </Route>
        <Route path="/admin/users">
          <AdminOnly>
            <AdminPage mode="users" />
          </AdminOnly>
        </Route>
        <Route path="/admin/activity">
          <AdminOnly>
            <AdminPage mode="activity" />
          </AdminOnly>
        </Route>
        <Route path="/admin/settings">
          <AdminOnly>
            <AdminPage mode="settings" />
          </AdminOnly>
        </Route>
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LoginEntry} />
      <Route path="/login" component={LoginEntry} />
      <Route component={Workspace} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
