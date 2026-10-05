import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({
  children,
  role,
  allowedRoles = [],
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-loader">
        <div className="loader-ring"></div>
        <p>Loading FIT-TRACK...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roles = allowedRoles.length > 0 ? allowedRoles : (role ? [role] : []);

  if (roles.length > 0 && !roles.includes(user.role)) {
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "trainer") return <Navigate to="/trainer" replace />;
    return <Navigate to="/member" replace />;
  }

  return children;
}