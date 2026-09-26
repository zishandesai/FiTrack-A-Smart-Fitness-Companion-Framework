import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, Brain } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";
import AIChatModal from "./AIChatModal";

export default function DashboardLayout({ children, title, subtitle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiInitialPrompt, setAiInitialPrompt] = useState("");

  const role = user?.role || "member";

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const handleOpenAIChat = (e) => {
      setShowAIChat(true);
      if (e.detail?.prompt) {
        setAiInitialPrompt(e.detail.prompt);
      }
    };
    window.addEventListener("fittrack:open-ai-chat", handleOpenAIChat);
    return () => window.removeEventListener("fittrack:open-ai-chat", handleOpenAIChat);
  }, []);

  const roleConfigs = {
    admin: { label: "ADMIN", color: "#ff5c67", bg: "rgba(255, 92, 103, 0.12)", border: "rgba(255, 92, 103, 0.3)" },
    trainer: { label: "TRAINER", color: "#55e7ff", bg: "rgba(85, 231, 255, 0.12)", border: "rgba(85, 231, 255, 0.3)" },
    member: { label: "MEMBER", color: "#b7ff3c", bg: "rgba(183, 255, 60, 0.12)", border: "rgba(183, 255, 60, 0.3)" },
  };

  const currentRole = roleConfigs[role] || roleConfigs.member;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className={`dash-container ${collapsed ? "sidebar-collapsed" : ""}`}>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="dash-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Close sidebar menu"
        />
      )}

      {/* Sidebar with User Component */}
      <Sidebar
        role={role}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <main className="dash-main">
        {/* Topbar */}
        <header className="dash-topbar">
          <div className="dash-topbar-left">
            {/* Mobile Hamburger Toggle Button */}
            <button
              className="dash-mobile-toggle"
              onClick={() => setMobileOpen(true)}
              aria-label="Open sidebar navigation"
              type="button"
            >
              <Menu size={20} />
            </button>

            <div className="dash-title-wrap">
              <h1 className="dash-page-title">{title}</h1>
              {subtitle && <p className="dash-page-subtitle">{subtitle}</p>}
            </div>
          </div>

          <div className="dash-topbar-right">
            <div
              className="dash-portal-tag"
              style={{
                color: currentRole.color,
                background: currentRole.bg,
                borderColor: currentRole.border,
              }}
            >
              <span className="dash-pulse-dot" style={{ background: currentRole.color }} />
              {currentRole.label}
            </div>

            <div className="dash-user-badge">
              <span className="dash-user-name">{user?.name || "Account"}</span>
              {user?.email && <span className="dash-user-email">{user.email}</span>}
            </div>

            <button
              className="btn btn-secondary btn-xs dash-topbar-logout"
              onClick={handleLogout}
              title="Logout from Account"
            >
              Logout
            </button>

            <Link to="/" className="dash-quick-home" title="View Public Landing Page">
              Public Site
            </Link>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="dash-content-body">{children}</div>

        {/* Floating AI NutriCoach Launcher Button */}
        <button
          className="floating-ai-launcher-btn"
          onClick={() => setShowAIChat(true)}
          title="Open FIT-TRACK NutriCoach AI (Sports Nutrition & Biomechanics)"
        >
          <div className="floating-ai-icon-pulse">
            <Brain size={18} />
          </div>
          <span className="font-semibold floating-ai-label">NutriCoach AI</span>
          <span className="floating-ai-sparkle">✨</span>
        </button>

        {/* NutriCoach AI Modal */}
        <AIChatModal
          isOpen={showAIChat}
          onClose={() => {
            setShowAIChat(false);
            setAiInitialPrompt("");
          }}
          initialPrompt={aiInitialPrompt}
        />
      </main>
    </div>
  );
}

