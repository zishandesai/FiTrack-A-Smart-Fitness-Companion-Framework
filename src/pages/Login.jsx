import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Loader2,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { user, login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated with a valid role, auto-navigate to their dashboard
  useEffect(() => {
    if (user?.role) {
      if (user.role === "admin") navigate("/admin", { replace: true });
      else if (user.role === "trainer") navigate("/trainer", { replace: true });
      else navigate("/member", { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const loggedInUser = await login(email, password);
      const role = loggedInUser?.role || "member";
      if (role === "admin") {
        navigate("/admin", { replace: true });
      } else if (role === "trainer") {
        navigate("/trainer", { replace: true });
      } else {
        navigate("/member", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Invalid email or password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <div className="auth-visual-grid" />
        <div className="auth-visual-glow" />

        <Link to="/" className="auth-brand">
          <span>
            <Activity size={18} />
          </span>
          FIT-TRACK
        </Link>

        <div className="auth-visual-content">
          <div className="auth-ai-badge">
            <Sparkles size={13} />
            SMART FITNESS TECHNOLOGY
          </div>

          <h1>
            YOUR TRAINING.
            <br />
            <span>YOUR DATA.</span>
            <br />
            YOUR PROGRESS.
          </h1>

          <p>
            Everything you need to train smarter, improve your movement and stay consistent.
          </p>

          <div className="auth-feature-mini">
            <div>
              <ShieldCheck size={18} />
            </div>
            <span>
              <strong>Secure Role Authentication</strong>
              <small>Admin, Trainer, and Member access strictly verified.</small>
            </span>
          </div>
        </div>

        <div className="auth-visual-footer">
          <span>FIT-TRACK Platform</span>
          <span>Role-Protected JWT</span>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-top-nav">
          <Link to="/" className="back-link">
            <ArrowLeft size={16} />
            Back to Home
          </Link>

          <span>
            Need an account? <Link to="/signup">Sign up</Link>
          </span>
        </div>

        <div className="auth-form-container">
          <div className="auth-mobile-brand">
            <Activity size={18} />
            FIT-TRACK
          </div>

          <div className="auth-heading">
            <div className="auth-small-label">SECURE PORTAL ACCESS</div>
            <h2>
              Sign in to
              <br />
              <span>FIT-TRACK.</span>
            </h2>
            <p>Enter your account credentials to access your dedicated portal.</p>
          </div>

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 14px",
                marginBottom: "16px",
                borderRadius: "8px",
                background: "rgba(255, 92, 103, 0.12)",
                border: "1px solid rgba(255, 92, 103, 0.3)",
                color: "#ff5c67",
                fontSize: "13px",
              }}
            >
              <AlertCircle size={17} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <div className="input-with-icon">
                <Mail size={16} />
                <input
                  className="form-input"
                  type="email"
                  placeholder="name@fittrack.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <div className="form-label-row">
                <label className="form-label">Password</label>
                <span className="text-muted text-2xs">Case sensitive</span>
              </div>

              <div className="input-with-icon">
                <LockKeyhole size={16} />
                <input
                  className="form-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              className="btn btn-primary auth-submit"
              type="submit"
              disabled={isSubmitting}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Verifying Account...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          {/* Quick Credential Pre-fills for Teacher & College Demonstration */}
          <div className="auth-quick-accounts-card">
            <div className="quick-accounts-header">
              <span className="quick-accounts-title">Official Accounts</span>
              <span className="quick-accounts-status">● Live Database</span>
            </div>

            <p className="quick-accounts-hint">
              Tap any role to autofill credentials for testing:
            </p>

            <div className="quick-accounts-grid">
              <button
                type="button"
                className="quick-account-chip admin"
                onClick={() => {
                  setEmail("admin@fittrack.com");
                  setPassword("Admin@12345");
                  setError("");
                }}
                title="Fill Admin credentials"
              >
                👑 Admin
              </button>

              <button
                type="button"
                className="quick-account-chip trainer"
                onClick={() => {
                  setEmail("trainer@fittrack.com");
                  setPassword("Trainer@12345");
                  setError("");
                }}
                title="Fill Trainer credentials"
              >
                🏋️ Trainer
              </button>

              <button
                type="button"
                className="quick-account-chip member"
                onClick={() => {
                  setEmail("member@fittrack.com");
                  setPassword("Member@12345");
                  setError("");
                }}
                title="Fill Member credentials"
              >
                ⚡ Member
              </button>
            </div>
          </div>

          <div className="auth-divider">
            <span />
            OR
            <span />
          </div>

          <p className="auth-signup">
            Don't have an account? <Link to="/signup">Create Member or Trainer Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}