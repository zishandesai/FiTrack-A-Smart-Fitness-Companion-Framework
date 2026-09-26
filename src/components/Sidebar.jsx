import { NavLink, useNavigate } from "react-router-dom";
import { X, ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({
  role = "member",
  collapsed,
  setCollapsed,
  mobileOpen = false,
  setMobileOpen,
}) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const menus = {
    member: [
      { icon: "▦", label: "Dashboard", path: "/member" },
      { icon: "⚡", label: "NutriCoach AI", path: "/member/nutricoach" },
      { icon: "◉", label: "My Workout", path: "/member/workout" },
      { icon: "♟", label: "Find a Coach", path: "/member/coaches" },
      { icon: "💬", label: "Coach Chat", path: "/member/chat" },
      { icon: "📝", label: "Admin Requests", path: "/member/requests" },
      { icon: "✦", label: "AI Form Coach", path: "/member/ai-coach" },
      { icon: "↗", label: "Progress", path: "/member/progress" },
      { icon: "◎", label: "Profile", path: "/member/profile" },
    ],

    trainer: [
      { icon: "▦", label: "Dashboard", path: "/trainer" },
      { icon: "⚡", label: "NutriCoach AI", path: "/trainer/nutricoach" },
      { icon: "♙", label: "Athletes Roster", path: "/trainer/members" },
      { icon: "＋", label: "Assign Workout", path: "/trainer/workout" },
      { icon: "💬", label: "Athlete Chat", path: "/trainer/chat" },
      { icon: "📝", label: "Staff Requests", path: "/trainer/requests" },
    ],

    admin: [
      { icon: "▦", label: "Dashboard", path: "/admin" },
      { icon: "♙", label: "Members", path: "/admin/members" },
      { icon: "♟", label: "Trainers", path: "/admin/trainers" },
      { icon: "◈", label: "Approval Desk", path: "/admin/memberships" },
      { icon: "◷", label: "Attendance", path: "/admin/attendance" },
    ],
  };

  const handleLogout = () => {
    if (setMobileOpen) setMobileOpen(false);
    logout();
    navigate("/login");
  };

  const handleLinkClick = () => {
    if (setMobileOpen) setMobileOpen(false);
  };

  return (
    <aside
      className={`sidebar ${collapsed ? "collapsed" : ""} ${
        mobileOpen ? "mobile-open" : ""
      }`}
    >
      <div className="sidebar-top">
        <div className="sidebar-logo">
          <span className="logo-mark">F</span>
          {(!collapsed || mobileOpen) && (
            <span>
              FIT<span>-TRACK</span>
            </span>
          )}
        </div>

        {/* Desktop Collapse Button */}
        <button
          className="collapse-btn desktop-only-btn"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* Mobile Close Button */}
        {setMobileOpen && (
          <button
            className="mobile-sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="sidebar-user">
        <div className="avatar">
          {user?.name?.charAt(0)?.toUpperCase() || "U"}
        </div>

        {(!collapsed || mobileOpen) && (
          <div className="sidebar-user-info">
            <strong>{user?.name || "User"}</strong>
            <small>{role}</small>
          </div>
        )}
      </div>

      <div className="sidebar-menu">
        <p className="sidebar-label">{(!collapsed || mobileOpen) && "MENU"}</p>

        {menus[role]?.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={handleLinkClick}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <span className="sidebar-icon">{item.icon}</span>

            {(!collapsed || mobileOpen) && <span>{item.label}</span>}
          </NavLink>
        ))}
      </div>

      <div className="sidebar-bottom">
        <button className="sidebar-link logout-btn" onClick={handleLogout}>
          <span className="sidebar-icon">
            <LogOut size={16} />
          </span>
          {(!collapsed || mobileOpen) && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}