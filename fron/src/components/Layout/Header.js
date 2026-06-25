import React from "react";
import { useAuth } from "../../context/AuthContext";
import { Search } from "lucide-react";

export default function Header({ title }) {
  const { organization } = useAuth();

  return (
    <header className="header">
      <div className="header-left">
        <h2>{title}</h2>
      </div>
      <div className="header-right">
        <div className="header-search">
          <Search />
          <input type="text" placeholder="Search..." />
        </div>
        {organization && (
          <span
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              fontWeight: 500,
            }}
          >
            {organization.name}
          </span>
        )}
      </div>
    </header>
  );
}
