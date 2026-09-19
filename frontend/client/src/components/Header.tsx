import { Link, useLocation } from "react-router-dom";

import UpdateChecker from "./UpdateChecker";

export default function Header() {
  const location = useLocation();

  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1rem 1.5rem",
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #dbe1e8",
      }}
    >
      <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
        Schedule Planner
      </h1>
      <nav style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <Link
          to="/"
          style={{
            fontWeight: location.pathname === "/" ? 700 : 500,
          }}
        >
          Calendar
        </Link>
        <Link
          to="/print"
          style={{
            fontWeight: location.pathname === "/print" ? 700 : 500,
          }}
        >
          Print Preview
        </Link>
        <UpdateChecker />
      </nav>
    </header>
  );
}
