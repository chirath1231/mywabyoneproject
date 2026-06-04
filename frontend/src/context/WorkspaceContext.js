import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import api from "../api/api";
import { useAuth } from "./AuthContext";

const WorkspaceContext = createContext();

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

// Default terminology fallbacks (used when no workspace terminology defined)
const DEFAULT_TERMS = {
  dashboard: "Dashboard",
  products: "Products",
  product: "Product",
  services: "Services",
  service: "Service",
  customers: "Customers",
  customer: "Customer",
  invoices: "Invoices",
  invoice: "Invoice",
  notifications: "Notifications",
  settings: "Settings",
  revenue: "Revenue",
  recent_invoices: "Recent Invoices",
  monthly_revenue: "Monthly Revenue",
  active_products: "Active Products",
  active_services: "Active Services",
  total_invoices: "Total Invoices",
  outstanding: "Outstanding",
};

export function WorkspaceProvider({ children }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(
    localStorage.getItem("wabyone_workspace_id") || null,
  );
  const [plan, setPlan] = useState({
    tier: "free",
    label: "Starter",
    workspace_limit: 1,
    workspace_count: 0,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await api.get("/workspaces");
      setWorkspaces(res.data.workspaces || []);
      setPlan(res.data.plan || plan);
      const cur =
        res.data.current_workspace_id || res.data.workspaces?.[0]?.id || null;
      if (cur) {
        setCurrentWorkspaceId(cur);
        localStorage.setItem("wabyone_workspace_id", cur);
      }
    } catch (err) {
      console.error("Failed to load workspaces:", err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const switchWorkspace = async (id) => {
    try {
      await api.post(`/workspaces/${id}/switch`);
      setCurrentWorkspaceId(id);
      localStorage.setItem("wabyone_workspace_id", id);
      // Hard reload to refresh all data scoped to new workspace
      window.location.reload();
    } catch (err) {
      console.error("Switch workspace failed:", err);
      throw err;
    }
  };

  const createWorkspace = async ({ name, preset_key }) => {
    const res = await api.post("/workspaces", {
      name,
      preset_key,
      make_active: true,
    });
    await refresh();
    if (res.data.workspace?.id) {
      localStorage.setItem("wabyone_workspace_id", res.data.workspace.id);
      window.location.reload();
    }
    return res.data;
  };

  const renameWorkspace = async (id, name) => {
    await api.put(`/workspaces/${id}`, { name });
    refresh();
  };

  const deleteWorkspace = async (id) => {
    await api.delete(`/workspaces/${id}`);
    refresh();
  };

  const upgradePlan = async (tier) => {
    await api.post("/workspaces/plan/upgrade", { tier });
    refresh();
  };

  const current =
    workspaces.find((w) => w.id === currentWorkspaceId) ||
    workspaces[0] ||
    null;

  // terminology helper: t('products') returns "Patients" for healthcare etc.
  const t = (key, fallback) => {
    const terms = current?.terminology || {};
    return terms[key] || fallback || DEFAULT_TERMS[key] || key;
  };

  const atLimit =
    plan.workspace_limit !== null && workspaces.length >= plan.workspace_limit;

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        current,
        currentWorkspaceId,
        plan,
        loading,
        atLimit,
        t,
        refresh,
        switchWorkspace,
        createWorkspace,
        renameWorkspace,
        deleteWorkspace,
        upgradePlan,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
