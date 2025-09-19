import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import './App.css';
import "./styles/AuthPage.css"; // Si deseas aplicar estilos globales también

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);