import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import Gate from "./components/Gate.jsx";
import "./index.css";

const LS_CODE = "ti-planner-code";

function Root() {
  const [code, setCode] = useState(() => (localStorage.getItem(LS_CODE) || "").trim().toLowerCase());

  if (!code) {
    return (
      <Gate
        onSubmit={(v) => {
          localStorage.setItem(LS_CODE, v);
          setCode(v);
        }}
      />
    );
  }
  return <App code={code} />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
