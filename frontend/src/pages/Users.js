import React from "react";
import Header from "../components/Layout/Header";
import AccessControlStudio from "../components/settings/AccessControlStudio";

export default function Users() {
  return (
    <>
      <Header title="Users" />
      <div className="page-content">
        <div className="page-header">
          <h1>Users</h1>
        </div>
        <AccessControlStudio />
      </div>
    </>
  );
}
