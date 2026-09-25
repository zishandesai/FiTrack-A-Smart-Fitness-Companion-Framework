import {
  ArrowRight,
  Menu,
  X,
  Activity,
  LogOut,
  LayoutDashboard,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate("/login");
  };

  const getRoleBadge = (role) => {
    if (role === "admin") {
      return {
        label: "ADMIN",
        style: {
          color: "#ff5c67",
          background: "rgba(255, 92, 103, 0.15)",
          border: "1px solid rgba(255, 92, 103, 0.35)",
        },
      };
    }
    if (role === "trainer") {
      return {
        label: "TRAINER",
        style: {
          color: "#55e7ff",
          background: "rgba(85, 231, 255, 0.15)",
          border: "1px solid rgba(85, 231, 255, 0.35)",
        },
      };
    }
    return {
      label: "MEMBER",
      style: {
        color: "#b7ff3c",
        background: "rgba(183, 255, 60, 0.15)",
        border: "1px solid rgba(183, 255, 60, 0.35)",
      },
    };
  };

  const roleInfo = user?.role ? getRoleBadge(user.role) : null;
  const dashboardPath = user?.role ? `/${user.role}` : "/login";

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand">
          <span className="brand-icon">
            <Activity size={18} />
          </span>
          <span>FIT-TRACK</span>
        </Link>

        <nav className={`nav-links ${open ? "open" : ""}`}>
          <Link to="/" onClick={() => setOpen(false)}>
            Home
          </Link>

          <a href="#features" onClick={() => setOpen(false)}>
            Features
          </a>

          <a href="#ai" onClick={() => setOpen(false)}>
            AI Coach
          </a>

          <a href="#about" onClick={() => setOpen(false)}>
            About
          </a>

          <div className="mobile-nav-actions">
            {isAuthenticated && user ? (
              <>
                <Link
                  className="btn btn-primary"
                  to={dashboardPath}
                  onClick={() => setOpen(false)}
                >
                  <LayoutDashboard size={15} />
                  {roleInfo?.label} Dashboard
                </Link>
                <button
                  className="btn btn-secondary"
                  onClick={handleLogout}
                  style={{ color: "#ff5c67" }}
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  className="btn btn-secondary"
                  to="/login"
                  onClick={() => setOpen(false)}
                >
                  Login
                </Link>
                <Link
                  className="btn btn-primary"
                  to="/signup"
                  onClick={() => setOpen(false)}
                >
                  Get Started
                  <ArrowRight size={16} />
                </Link>
              </>
            )}
          </div>
        </nav>

        <div className="nav-actions">
          {isAuthenticated && user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {roleInfo && (
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: "999px",
                    fontSize: "11px",
                    fontWeight: "700",
                    letterSpacing: "0.5px",
                    ...roleInfo.style,
                  }}
                >
                  {roleInfo.label}
                </span>
              )}

              <Link
                className="btn btn-primary nav-cta"
                to={dashboardPath}
                style={{ padding: "8px 16px", fontSize: "13px" }}
              >
                <LayoutDashboard size={14} />
                Open Dashboard
                <ArrowRight size={14} />
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-secondary"
                style={{
                  padding: "8px 12px",
                  fontSize: "12px",
                  color: "#ff5c67",
                  borderColor: "rgba(255, 92, 103, 0.25)",
                }}
                title="Sign out of your account"
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          ) : (
            <>
              <Link className="nav-login" to="/login">
                Login
              </Link>
              <Link className="btn btn-primary nav-cta" to="/signup">
                Get Started
                <ArrowRight size={16} />
              </Link>
            </>
          )}
        </div>

        <button
          className="mobile-menu-btn"
          onClick={() => setOpen(!open)}
          aria-label="Toggle navigation"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </header>
  );
}