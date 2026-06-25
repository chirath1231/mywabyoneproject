import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout() {
  const { pathname } = useLocation();
  const showSidebar = pathname === "/" || pathname.startsWith("/");

  return (
    <div className="app-layout">
      {showSidebar && <Sidebar />}
      <main className={`main-content ${!showSidebar ? "no-sidebar" : ""}`}>
        <Outlet />
      </main>
    </div>
  );
}
