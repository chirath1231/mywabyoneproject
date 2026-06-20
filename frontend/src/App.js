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
        <Route path="/products" element={<Products />} />
        <Route path="/services" element={<Services />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/whatsapp" element={<WhatsAppPage />} />     {/* ← ADD */}
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