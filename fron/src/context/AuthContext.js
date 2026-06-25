import React, { createContext, useState, useContext, useEffect } from "react";
import api from "../api/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("wabyone_token");
    const expiryTime = localStorage.getItem("wabyone_token_expiry");

    if (expiryTime && new Date().getTime() > parseInt(expiryTime)) {
      localStorage.removeItem("wabyone_token");
      localStorage.removeItem("wabyone_user");
      localStorage.removeItem("wabyone_org");
      localStorage.removeItem("wabyone_remember_me");
      localStorage.removeItem("wabyone_token_expiry");
      setLoading(false);
      return;
    }

    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data.user);
      setOrganization(res.data.organization);
    } catch {
      localStorage.removeItem("wabyone_token");
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, rememberMe = false) => {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("wabyone_token", res.data.token);

    if (rememberMe) {
      localStorage.setItem("wabyone_remember_me", "true");
      const expiryTime = new Date().getTime() + 30 * 24 * 60 * 60 * 1000;
      localStorage.setItem("wabyone_token_expiry", expiryTime.toString());
    } else {
      localStorage.removeItem("wabyone_remember_me");
      localStorage.removeItem("wabyone_token_expiry");
    }

    setUser(res.data.user);
    setOrganization(res.data.organization);
    return res.data;
  };

  // Google login — pass the full credentialResponse from @react-oauth/google
  const loginWithGoogle = async (credentialResponse) => {
    const res = await api.post("/auth/google", {
      credential: credentialResponse.credential,
    });

    localStorage.setItem("wabyone_token", res.data.token);
    // Google tokens last 7 days on the server — mirror that as expiry
    const expiryTime = new Date().getTime() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem("wabyone_token_expiry", expiryTime.toString());

    setUser(res.data.user);
    setOrganization(res.data.organization);
    return res.data;
  };

  const register = async (data) => {
    const res = await api.post("/auth/register", data);
    localStorage.setItem("wabyone_token", res.data.token);
    setUser(res.data.user);
    setOrganization(res.data.organization);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("wabyone_token");
    localStorage.removeItem("wabyone_remember_me");
    localStorage.removeItem("wabyone_token_expiry");
    setUser(null);
    setOrganization(null);
  };

  const updateOrganization = (org) => {
    setOrganization(org);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        loading,
        login,
        loginWithGoogle,
        register,
        logout,
        updateOrganization,
        loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}