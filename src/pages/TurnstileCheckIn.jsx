import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  Mail,
  User,
  Clock,
  Calendar,
  Sparkles,
  ArrowRight,
  Flame,
  Dumbbell,
  AlertCircle,
  RefreshCw,
  Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { logSmartAttendanceCheckIn, getMembersList } from "../services/mockData";

export default function TurnstileCheckIn() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Clock state
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState(null);
  const [useExistingSession, setUseExistingSession] = useState(!!(user && (user.email || user.name)));

  // Play audio harmonic access chime on check-in
  const playChime = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "triangle";

      // Pleasant major chord (C5 -> G5)
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15);

      osc2.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.18);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.65);
      osc2.stop(ctx.currentTime + 0.65);
    } catch {}
  };

  const handleCheckIn = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        email: useExistingSession ? (user?.email || email) : email,
        password: useExistingSession ? undefined : password,
        memberName: useExistingSession ? (user?.name || user?.email) : undefined,
        role,
        method: "QR Turnstile Mobile Scan",
      };

      const result = await logSmartAttendanceCheckIn(payload);
      if (result && result.success) {
        playChime();
        setSuccessData(result);
      }
    } catch (err) {
      setError(err?.message || "Check-in failed. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPreset = (presetEmail, presetRole) => {
    setEmail(presetEmail);
    setPassword("123456");
    setRole(presetRole);
    setUseExistingSession(false);
    setError("");
  };

  const formattedDate = currentTime.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const formattedClock = currentTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="turnstile-portal-bg min-h-screen flex flex-col justify-between p-4 md:p-8">
      {/* Top Navbar Header */}
      <header className="max-w-md mx-auto w-full flex items-center justify-between py-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green flex items-center justify-center text-black font-extrabold text-sm shadow-[0_0_15px_rgba(183,255,60,0.4)]">
            F
          </div>
          <div>
            <h1 className="font-bold text-white text-sm tracking-wide">FIT-TRACK</h1>
            <p className="text-[10px] text-muted -mt-0.5">Smart Gym Turnstile</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-white/[0.04] border border-white/[0.08] px-2.5 py-1 rounded-full text-green">
          <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
          <span>TERMINAL ONLINE</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md mx-auto w-full my-auto py-6">
        {/* SUCCESS PASS STATE */}
        {successData ? (
          <div className="turnstile-pass-card animate-fade-in text-center">
            <div className="turnstile-gate-halo mx-auto mb-4">
              <CheckCircle2 size={42} className="text-green animate-bounce" />
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-green/15 border border-green/40 text-green font-bold text-xs tracking-wider uppercase mb-2">
              ✓ ACCESS GRANTED • TURNSTILE UNLOCKED
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight">
              Welcome, {successData.user?.name || successData.user?.email || "Athlete"}!
            </h2>
            <p className="text-xs text-muted mt-1">
              Your daily gym attendance has been verified and logged in the system.
            </p>

            {/* Pass Metadata Grid */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 my-5 text-left space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted flex items-center gap-1.5">
                  <Clock size={13} className="text-cyan" /> Entry Timestamp
                </span>
                <strong className="text-white font-mono">{successData.timestamp}</strong>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-muted flex items-center gap-1.5">
                  <Calendar size={13} className="text-green" /> Check-in Date
                </span>
                <strong className="text-white">{currentTime.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</strong>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-muted flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-amber-400" /> Account Role
                </span>
                <span className="badge badge-green font-mono text-[11px] uppercase">
                  {successData.user?.role || "MEMBER"}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-muted flex items-center gap-1.5">
                  <Sparkles size={13} className="text-cyan" /> Turnstile Method
                </span>
                <span className="text-cyan font-semibold">QR Mobile Scan</span>
              </div>

              {successData.record?.attendanceRate !== undefined && (
                <div className="flex justify-between items-center text-xs pt-2 border-t border-white/[0.06]">
                  <span className="text-muted flex items-center gap-1.5">
                    <Flame size={13} className="text-green" /> Monthly Attendance
                  </span>
                  <strong className="text-green font-mono text-sm">{successData.record.attendanceRate}%</strong>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Link
                to={successData.user?.role === "trainer" ? "/trainer" : successData.user?.role === "admin" ? "/admin/attendance" : "/member"}
                className="btn btn-primary full-width flex items-center justify-center gap-2 py-3"
              >
                <span>Proceed to Dashboard</span>
                <ArrowRight size={16} />
              </Link>

              <button
                onClick={() => {
                  setSuccessData(null);
                  setPassword("");
                }}
                className="btn btn-secondary full-width text-xs py-2 text-muted hover:text-white"
              >
                Check In Another Member / Trainer
              </button>
            </div>
          </div>
        ) : (
          /* FORM / VERIFY SCREEN */
          <div className="turnstile-pass-card">
            {/* Live Terminal Clock Banner */}
            <div className="text-center mb-6">
              <div className="text-xs text-muted font-medium uppercase tracking-wider">
                {formattedDate}
              </div>
              <div className="text-3xl font-extrabold text-white font-mono mt-1 tracking-tight">
                {formattedClock}
              </div>
              <p className="text-[11px] text-green mt-1 flex items-center justify-center gap-1.5">
                <Zap size={12} /> Turnstile Sensor Armed & Ready
              </p>
            </div>

            {error && (
              <div className="alert alert-danger mb-4 flex items-center gap-2 text-xs">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Mode 1: Already logged in user detected */}
            {useExistingSession && user ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-green/30 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green/20 border border-green/40 flex items-center justify-center text-green font-bold text-lg shrink-0">
                    {(user.name || user.email || "M").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-sm truncate">
                        {user.name || "Member"}
                      </h3>
                      <span className="badge badge-green text-[10px] uppercase">
                        {user.role || "Member"}
                      </span>
                    </div>
                    <p className="text-muted text-xs truncate mt-0.5">{user.email}</p>
                  </div>
                </div>

                <p className="text-muted text-xs text-center leading-relaxed">
                  Your mobile session is verified. Tap below to log today's attendance and unlock the entrance gate.
                </p>

                <button
                  onClick={handleCheckIn}
                  disabled={loading}
                  className="btn btn-primary full-width py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(183,255,60,0.3)]"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Verifying & Unlocking Gate...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={18} />
                      <span>Unlock Turnstile & Check In</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUseExistingSession(false);
                      setEmail("");
                      setPassword("");
                    }}
                    className="text-xs text-muted hover:text-white underline"
                  >
                    Check in with a different account
                  </button>
                </div>
              </div>
            ) : (
              /* Mode 2: Phone camera scan without active session */
              <form onSubmit={handleCheckIn} className="space-y-4">
                <div className="text-center mb-4">
                  <h3 className="font-bold text-white text-base">
                    Gym Turnstile Verification
                  </h3>
                  <p className="text-muted text-xs mt-1">
                    Enter your registered member or trainer credentials to record attendance.
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label flex items-center justify-between text-xs">
                    <span>Email Address</span>
                    <span className="text-muted text-[10px]">Registered Account</span>
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. 24ds39@aiktc.ac.in"
                      className="form-input pl-9"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label flex items-center justify-between text-xs">
                    <span>Password</span>
                    <span className="text-muted text-[10px]">Security Credential</span>
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="form-input pl-9"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary full-width py-3 text-sm font-bold flex items-center justify-center gap-2 mt-2 shadow-[0_0_20px_rgba(183,255,60,0.3)]"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Verifying & Recording Attendance...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={18} />
                      <span>Verify & Unlock Turnstile</span>
                    </>
                  )}
                </button>

                {/* 1-Tap Quick Credentials for Testing & Demonstration */}
                <div className="pt-3 border-t border-white/[0.08]">
                  <div className="text-[10px] text-muted uppercase font-bold tracking-wider text-center mb-2">
                    ⚡ Quick Demo Scan Presets
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickPreset("24ds39@aiktc.ac.in", "member")}
                      className="btn btn-secondary btn-xs text-[11px] py-2 flex items-center justify-center gap-1"
                    >
                      <User size={12} />
                      <span>Jaki Md (Member)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPreset("zishan@fittrack.com", "trainer")}
                      className="btn btn-secondary btn-xs text-[11px] py-2 flex items-center justify-center gap-1"
                    >
                      <Dumbbell size={12} />
                      <span>Coach Zishan</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-md mx-auto w-full text-center py-2 text-[11px] text-muted">
        FIT-TRACK Cloud Attendance Engine • AES-256 Encrypted Entrance Access
      </footer>
    </div>
  );
}
