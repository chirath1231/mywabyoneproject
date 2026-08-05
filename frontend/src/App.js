import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import Layout from "./components/Layout/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";      // ← ADD
import ResetPassword from "./pages/ResetPassword";        // ← ADD
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Services from "./pages/Services";
import Customers from "./pages/Customers";
import Invoices from "./pages/Invoices";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import Home from "./pages/Home";
import UserHome from "./pages/UserHome";
import CatalogDetails from "./pages/CatalogDetails";
import Onboarding from "./pages/Onboarding";
import Storefront from "./pages/Storefront";
import StorefrontItemDetail from "./pages/StorefrontItemDetail";
import Tour from "./components/Tour";
import VerifyOTP from "./pages/VerifyOTP";
import WhatsAppPage from "./pages/WhatsAppPage";           // ← ADD
import Reports from "./pages/Reports";
import Expenses from "./pages/Expenses";
import Purchases from "./pages/Purchases";
import Suppliers from "./pages/Suppliers";
import POS from "./pages/POS";
import Sales from "./pages/Sales";
import Users from "./pages/Users";
import ActivityLog from "./pages/ActivityLog";


function ProtectedRoute({ children }) {
  const { user, organization, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div className="spinner" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  if (organization && !organization.onboarding_completed) {
    return <Navigate to="/onboarding" />;
  }
  return children;
}

// Blocks direct URL access to a page whose module isn't enabled for the
// org's plan — Sidebar already hides the link, this stops typing/bookmarking
// the route to reach it anyway.
function ModuleRoute({ module, children }) {
  const { hasModule } = useAuth();
  if (!hasModule(module)) return <Navigate to="/" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div className="spinner" />
      </div>
    );
  }
  return !user ? children : <Navigate to="/" />;
}

function OnboardingRoute({ children }) {
  const { user, organization, loading } = useAuth();
  if (loading) return <div className="spinner" />;
  if (!user) return <Navigate to="/login" />;
  if (organization?.onboarding_completed) return <Navigate to="/" />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/store/:slug" element={<Storefront />} />
      <Route path="/store/:slug/:type/:id" element={<StorefrontItemDetail />} />

      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* ── Password reset routes (public) ── */}
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        }
      />

      <Route 
      path="/verify-otp"      
      element={<VerifyOTP />} />

      <Route
        path="/reset-password"
        element={
          <PublicRoute>
            <ResetPassword />
          </PublicRoute>
        }
      />

      <Route
        path="/onboarding"
        element={
          <OnboardingRoute>
            <Onboarding />
          </OnboardingRoute>
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <>
              <Layout />
              <Tour />
            </>
          </ProtectedRoute>
        }
      >
        <Route path="catalog/:type/:id" element={<CatalogDetails />} />
        <Route path="" element={<Dashboard />} />
        <Route path="/products" element={<ModuleRoute module="products"><Products /></ModuleRoute>} />
        <Route path="/services" element={<ModuleRoute module="services"><Services /></ModuleRoute>} />
        <Route path="/customers" element={<ModuleRoute module="customers"><Customers /></ModuleRoute>} />
        <Route path="/invoices" element={<ModuleRoute module="invoices"><Invoices /></ModuleRoute>} />
        <Route path="/purchases" element={<ModuleRoute module="purchases"><Purchases /></ModuleRoute>} />
        <Route path="/suppliers" element={<ModuleRoute module="suppliers"><Suppliers /></ModuleRoute>} />
        <Route path="/pos" element={<ModuleRoute module="pos"><POS /></ModuleRoute>} />
        <Route path="/sales" element={<ModuleRoute module="sales"><Sales /></ModuleRoute>} />
        <Route path="/users" element={<Users />} />
        <Route path="/activity-log" element={<ActivityLog />} />
        <Route path="/expenses" element={<ModuleRoute module="expenses"><Expenses /></ModuleRoute>} />
        <Route path="/notifications" element={<ModuleRoute module="notifications"><Notifications /></ModuleRoute>} />
        <Route path="/whatsapp" element={<ModuleRoute module="whatsapp"><WhatsAppPage /></ModuleRoute>} />
        <Route path="/reports" element={<ModuleRoute module="reports"><Reports /></ModuleRoute>} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <WorkspaceProvider>
            <Toaster
              position="top-right"
              containerStyle={{ zIndex: 99999 }}
              toastOptions={{
                style: {
                  background: "var(--bg-secondary)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                },
              }}
            />
            <AppRoutes />
          </WorkspaceProvider>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}