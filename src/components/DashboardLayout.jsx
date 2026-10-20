import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Menu,
  Brain,
  LayoutDashboard,
  Dumbbell,
  Sparkles,
  User,
  Users,
  ShieldCheck,
  FileText,
  CalendarCheck,
  PlusCircle,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";
import AIChatModal from "./AIChatModal";
import ThreeDumbbellBackground from "./ThreeDumbbellBackground";

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
    member: { label: "MEMBER", color: "#38bdf8", bg: "rgba(56, 189, 248, 0.12)", border: "rgba(56, 189, 248, 0.3)" },
  };

  const currentRole = roleConfigs[role] || roleConfigs.member;

  const mobileNavItems = {
    member: [
      { label: "Dashboard", path: "/member", icon: LayoutDashboard },
      { label: "Workout", path: "/member/workout", icon: Dumbbell },
      { label: "NutriCoach", path: "/member/nutricoach", icon: Brain },
      { label: "AI Form", path: "/member/ai-coach", icon: Sparkles },
      { label: "Profile", path: "/member/profile", icon: User },
    ],
    trainer: [
      { label: "Dashboard", path: "/trainer", icon: LayoutDashboard },
      { label: "Athletes", path: "/trainer/members", icon: Users },
      { label: "Assign", path: "/trainer/workout", icon: PlusCircle },
      { label: "NutriCoach", path: "/trainer/nutricoach", icon: Brain },
      { label: "Chat", path: "/trainer/chat", icon: MessageSquare },
    ],
    admin: [
      { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
      { label: "Members", path: "/admin/members", icon: Users },
      { label: "Trainers", path: "/admin/trainers", icon: ShieldCheck },
      { label: "Desk", path: "/admin/memberships", icon: FileText },
      { label: "Attendance", path: "/admin/attendance", icon: CalendarCheck },
    ],
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className={`dash-container ${collapsed ? "sidebar-collapsed" : ""}`}>
      {/* 3D Animated Interactive Dumbbell Background */}
      <ThreeDumbbellBackground />

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

        {/* Mobile Bottom Navigation Bar (Gym-Engineered Mobile Experience) */}
        <nav className="dash-mobile-bottom-nav" aria-label="Mobile Navigation">
          {(mobileNavItems[role] || mobileNavItems.member).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/member" || item.path === "/trainer" || item.path === "/admin"}
                className={({ isActive }) =>
                  `dash-bottom-nav-item ${isActive ? "active" : ""}`
                }
              >
                <div className="bottom-nav-icon-wrap">
                  <Icon size={19} />
                </div>
                <span className="bottom-nav-label">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </main>
    </div>
  );
}

