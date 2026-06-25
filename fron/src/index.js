import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./index.css";
const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <GoogleOAuthProvider clientId={"809126853420-6jctf8vkof9i7lbp5mv1nksmt3kj6dd5.apps.googleusercontent.com"}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </GoogleOAuthProvider>
);