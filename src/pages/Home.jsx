import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowRight,
  Play,
  Brain,
  TrendingUp,
  UserRound,
  Activity,
  Check,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  Zap,
  Target,
  Flame,
  CheckCircle2,
  Eye,
  Dumbbell,
  BarChart3,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import aiPoseImg from "../assets/ai_pose_hud.jpg";

/* ─── Data ─── */
const features = [
  {
    icon: Brain,
    title: "AI Form Coach",
    desc: "Real-time computer-vision pose analysis that tracks 33 body landmarks and scores every rep for perfect technique.",
    tag: "COMPUTER VISION",
    accent: "cyan",
  },
  {
    icon: TrendingUp,
    title: "Smart Progress",
    desc: "Track body composition, workout volume, attendance streaks and AI form scores in one unified analytics dashboard.",
    tag: "ANALYTICS",
    accent: "green",
  },
  {
    icon: UserRound,
    title: "Personalized Training",
    desc: "Certified trainers build custom workout splits tailored to your goals, schedule, and progression data.",
    tag: "TRAINING",
    accent: "green",
  },
  {
    icon: ShieldCheck,
    title: "Membership Portal",
    desc: "Seamless plan selection, admin-verified payments, and real-time membership status tracking in one place.",
    tag: "MANAGEMENT",
    accent: "cyan",
  },
];

const metrics = [
  { end: 50, suffix: "K+", label: "Reps Analyzed", icon: Eye },
  { end: 98, suffix: "%", decimal: true, decVal: 98.4, label: "Form Precision", icon: Target },
  { end: 35, prefix: "<", suffix: "ms", label: "Inference Speed", icon: Zap },
  { end: 100, suffix: "%", label: "JWT Security", icon: ShieldCheck },
];

const steps = [
  { n: "01", title: "Create Account", desc: "Sign up with your bio-stats, weight, and fitness goal." },
  { n: "02", title: "Request Membership", desc: "Select Basic, Pro, or Premium plan in the app." },
  { n: "03", title: "Pay at Gym", desc: "Submit your cash payment at the gym front desk." },
  { n: "04", title: "Admin Approves", desc: "Desk admin verifies cash and activates your membership." },
  { n: "05", title: "Start Training", desc: "Follow trainer-assigned splits and use AI Form Coach." },
  { n: "06", title: "Track Progress", desc: "Monitor weight, consistency, and biomechanics scores." },
];

const AI_EXERCISES = {
  squat: {
    name: "Barbell Back Squat",
    cat: "LOWER BODY",
    metrics: [
      { label: "Knee Flexion", val: "95°" },
      { label: "Hip Hinge", val: "115°" },
      { label: "Bar Velocity", val: "0.42 m/s" },
    ],
    emg: "88", muscle: "Quadriceps", reps: 12, confidence: "99.4",
    feedback: "Kinetic chain aligned. Lumbar stability preserved through full depth.",
  },
  deadlift: {
    name: "Conventional Deadlift",
    cat: "POSTERIOR CHAIN",
    metrics: [
      { label: "Knee Angle", val: "142°" },
      { label: "Torso Incline", val: "48°" },
      { label: "Bar Velocity", val: "0.38 m/s" },
    ],
    emg: "94", muscle: "Glutes & Hams", reps: 8, confidence: "98.8",
    feedback: "Exceptional lat recruitment. Symmetrical barbell path maintained.",
  },
  press: {
    name: "Overhead Press",
    cat: "UPPER BODY",
    metrics: [
      { label: "Elbow Extension", val: "178°" },
      { label: "Shoulder Elev.", val: "164°" },
      { label: "Bar Velocity", val: "0.31 m/s" },
    ],
    emg: "91", muscle: "Ant. Deltoid", reps: 10, confidence: "99.1",
    feedback: "Perfect vertical trajectory. Core braced with zero hyperextension.",
  },
};

/* ─── Hooks ─── */
function useScrollReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("revealed"); }),
      { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function useCountUp(ref, end, duration = 1600) {
  useEffect(() => {
    if (!ref.current) return;
    let started = false;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started) {
        started = true;
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          ref.current.textContent = Math.floor(eased * end);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [ref, end, duration]);
}

/* ─── Particle Canvas ─── */
function ParticleField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    let w, h, particles, raf;

    const resize = () => {
      w = cvs.width = cvs.offsetWidth;
      h = cvs.height = cvs.offsetHeight;
    };

    const init = () => {
      resize();
      particles = Array.from({ length: 60 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.5 + 0.5,
        dx: (Math.random() - 0.5) * 0.3,
        dy: (Math.random() - 0.5) * 0.2 - 0.1,
        o: Math.random() * 0.4 + 0.1,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(183,255,60,${p.o})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    init();
    draw();
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} className="particle-canvas" aria-hidden="true" />;
}

/* ─── Metric Counter ─── */
function MetricCard({ item, i }) {
  const numRef = useRef(null);
  useCountUp(numRef, item.decimal ? item.decVal : item.end);
  const Icon = item.icon;

  return (
    <div className="metric-card" data-reveal data-delay={i}>
      <div className="metric-icon-wrap">
        <Icon size={18} />
      </div>
      <div className="metric-number">
        {item.prefix && <span className="metric-prefix">{item.prefix}</span>}
        <span ref={numRef} className="metric-val">0</span>
        <span className="metric-suffix">{item.suffix}</span>
      </div>
      <span className="metric-label">{item.label}</span>
    </div>
  );
}

/* ─── Feature Card ─── */
function FeatureCard({ f, i }) {
  const Icon = f.icon;
  return (
    <div className={`ft-card ft-${f.accent}`} data-reveal data-delay={i}>
      <div className="ft-badge">{f.tag}</div>
      <div className="ft-icon"><Icon size={26} /></div>
      <h3>{f.title}</h3>
      <p>{f.desc}</p>
      <span className="ft-link">Learn more <ArrowRight size={14} /></span>
    </div>
  );
}

/* ─── AI HUD ─── */
function AIHud() {
  const [ex, setEx] = useState("squat");
  const d = AI_EXERCISES[ex];

  return (
    <div className="hud" data-reveal>
      {/* Corner brackets */}
      <i className="hud-corner tl" /><i className="hud-corner tr" />
      <i className="hud-corner bl" /><i className="hud-corner br" />

      {/* Header */}
      <div className="hud-head">
        <div className="hud-status">
          <span className="hud-beacon"><span /><span /></span>
          <div>
            <small>AI COMPUTER VISION</small>
            <strong>{d.name}</strong>
          </div>
        </div>
        <div className="hud-tabs">
          {["squat", "deadlift", "press"].map((id) => (
            <button
              key={id}
              type="button"
              className={ex === id ? "active" : ""}
              onClick={() => setEx(id)}
            >
              {id === "squat" ? "Squat" : id === "deadlift" ? "Deadlift" : "Press"}
            </button>
          ))}
        </div>
      </div>

      {/* Viewport */}
      <div className="hud-viewport">
        <img src={aiPoseImg} alt="AI biomechanics analysis" className="hud-img" />
        <div className="hud-grid-overlay" />
        <div className="hud-vignette" />
        <div className="hud-scan-line" />

        {/* Telemetry badges */}
        <div className="hud-telem hud-telem-left">
          {d.metrics.map((m) => (
            <div key={m.label} className="telem-row">
              <span>{m.label}</span><strong>{m.val}</strong>
            </div>
          ))}
        </div>

        <div className="hud-telem hud-telem-right">
          <div className="telem-row">
            <span>EMG {d.muscle}</span><strong>{d.emg}%</strong>
          </div>
          <div className="telem-bar"><div style={{ width: `${d.emg}%` }} /></div>
        </div>

        {/* Rep badge */}
        <div className="hud-reps">
          <span>REPS</span>
          <strong>{d.reps}</strong>
        </div>
      </div>

      {/* Footer */}
      <div className="hud-foot">
        <div className="hud-feedback">
          <CheckCircle2 size={14} />
          <span>{d.feedback}</span>
        </div>
        <div className="hud-conf">
          <small>CONFIDENCE</small>
          <strong>{d.confidence}%</strong>
        </div>
      </div>
    </div>
  );
}

/* ─── Dashboard Preview ─── */
function DashPreview({ user }) {
  const name = user?.name || "Alex";
  const letter = (user?.name || "A")[0].toUpperCase();

  return (
    <div className="dash-preview-wrap" data-reveal data-delay={1}>
      <div className="dash-preview">
        {/* Top bar */}
        <div className="dp-top">
          <div>
            <small className="dp-eyebrow">{user?.role ? `${user.role.toUpperCase()} DASHBOARD` : "MEMBER DASHBOARD"}</small>
            <h4>Good morning, {name}</h4>
          </div>
          <div className="dp-avatar">{letter}</div>
        </div>

        {/* Stats row */}
        <div className="dp-stats">
          {[["WEIGHT", "72.4", "kg"], ["ATTENDANCE", "94", "%"], ["FORM", "92", "%"]].map(([l, v, u]) => (
            <div className="dp-stat" key={l}><span>{l}</span><strong>{v}<small>{u}</small></strong></div>
          ))}
        </div>

        {/* Workout list */}
        <div className="dp-workout">
          <div className="dp-section-head">
            <div><small>YOUR WORKOUT</small><strong>Lower Body Strength</strong></div>
            <span className="dp-pct">75%</span>
          </div>
          <div className="dp-bar"><div /></div>
          {[["Squats", "4×12", true], ["Lunges", "3×10", true], ["Leg Press", "3×12", false]].map(([n, r, done]) => (
            <div className="dp-exercise" key={n}>
              <div className={`dp-check ${done ? "done" : ""}`}>{done && <Check size={10} />}</div>
              <span>{n}</span><small>{r}</small>
            </div>
          ))}
        </div>

        {/* AI badge */}
        <div className="dp-ai-chip"><Sparkles size={12} /> AI INSIGHT <strong>+8% form improvement</strong></div>
      </div>

      {/* Floating pills */}
      <div className="fp fp-ai"><Brain size={14} /><div><small>AI STATUS</small><strong>LIVE</strong></div></div>
      <div className="fp fp-prog"><TrendingUp size={14} /><div><small>THIS WEEK</small><strong>+12.4%</strong></div></div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   HOME PAGE
═══════════════════════════════════════════ */
export default function Home() {
  const { user, isAuthenticated } = useAuth();
  useScrollReveal();

  return (
    <div className="home-page">
      <Navbar />

      {/* ─── HERO ─── */}
      <section className="hero">
        <ParticleField />
        <div className="hero-glow-orb hero-glow-1" />
        <div className="hero-glow-orb hero-glow-2" />

        <div className="container hero-grid">
          <div className="hero-text" data-reveal>
            <div className="hero-chip">
              <Sparkles size={13} />
              <span>AI-POWERED FITNESS PLATFORM</span>
            </div>

            <h1>
              TRAIN<br />
              <span className="grad-text">SMARTER.</span><br />
              MOVE BETTER.<br />
              <span className="grad-text">TRACK&nbsp;EVERYTHING.</span>
            </h1>

            <p className="hero-sub">
              An intelligent fitness companion combining personalized workouts,
              AI-assisted exercise form analysis and smart progress tracking.
            </p>

            <div className="hero-ctas">
              {isAuthenticated && user ? (
                <Link to={`/${user.role}`} className="btn btn-primary hero-btn">
                  {user.role.toUpperCase()} Dashboard <ArrowRight size={17} />
                </Link>
              ) : (
                <Link to="/signup" className="btn btn-primary hero-btn">
                  Start Your Journey <ArrowRight size={17} />
                </Link>
              )}
              <a href="#features" className="btn btn-glass hero-btn">
                <span className="play-icon"><Play size={12} fill="currentColor" /></span>
                Explore Features
              </a>
            </div>

            <div className="hero-trust" data-reveal data-delay={1}>
              <div className="trust-icon"><Activity size={16} /></div>
              <div><strong>Production Ready v2.4</strong><small>Multimodal AI & 3D Kinematics Active</small></div>
            </div>
          </div>

          <DashPreview user={user} />
        </div>

        <div className="hero-fade" />
      </section>

      {/* ─── METRICS ─── */}
      <section className="metrics-strip">
        <div className="container metrics-row">
          {metrics.map((m, i) => <MetricCard item={m} i={i} key={m.label} />)}
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="section" id="features">
        <div className="container">
          <div className="section-head-split" data-reveal>
            <div>
              <div className="section-label">THE FIT-TRACK SYSTEM</div>
              <h2 className="section-title">EVERYTHING YOU NEED<br />TO TRAIN <span className="grad-text">SMARTER.</span></h2>
            </div>
            <p className="section-desc">
              Built around the things that actually matter: better training, better movement and measurable progress.
            </p>
          </div>
          <div className="ft-grid">
            {features.map((f, i) => <FeatureCard f={f} i={i} key={f.title} />)}
          </div>
        </div>
      </section>

      {/* ─── AI SECTION ─── */}
      <section className="section ai-sect" id="ai">
        <div className="ai-bg-glow" />
        <div className="container">
          <div className="section-head-split" data-reveal>
            <div>
              <div className="section-label lbl-cyan">AI COMPUTER VISION</div>
              <h2 className="section-title">YOUR FORM.<br /><span className="grad-text-cyan">ANALYZED BY AI.</span></h2>
            </div>
            <p className="section-desc">
              FIT-TRACK uses AI-assisted pose analysis to understand your movement and provide real-time technique feedback.
            </p>
          </div>

          <div className="ai-layout">
            <AIHud />
            <div className="ai-info-col">
              {[
                { icon: Activity, n: "01", t: "Track movement", d: "Body landmarks tracked in 3D space to evaluate joint angles, posture integrity, and kinetic chain alignment." },
                { icon: ShieldCheck, n: "02", t: "Detect form flaws", d: "Intelligent rules detect knee valgus, lumbar rounding, asymmetric drive, and lockout issues." },
                { icon: TrendingUp, n: "03", t: "Improve over time", d: "Every analyzed rep logs into your biometric timeline so improvement is visible over months." },
              ].map((c, i) => {
                const Ic = c.icon;
                return (
                  <div className="ai-card" key={c.n} data-reveal data-delay={i}>
                    <div className="ai-card-icon"><Ic size={18} /></div>
                    <div>
                      <small>{c.n}</small>
                      <h3>{c.t}</h3>
                      <p>{c.d}</p>
                    </div>
                  </div>
                );
              })}
              <Link to="/signup" className="btn btn-primary" data-reveal data-delay={3}>
                Try AI Form Coach <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PROGRESS ─── */}
      <section className="section" id="about">
        <div className="container">
          <div className="section-head-split" data-reveal>
            <div>
              <div className="section-label">SMART PROGRESS</div>
              <h2 className="section-title">SEE THE WORK.<br /><span className="grad-text">MEASURE THE CHANGE.</span></h2>
            </div>
            <p className="section-desc">
              Stop guessing whether you're improving. FIT-TRACK turns your training history into clear, meaningful analytics.
            </p>
          </div>

          <div className="prog-grid">
            {/* Chart card */}
            <div className="prog-chart-card" data-reveal>
              <div className="prog-chart-head">
                <div><small>PROGRESS OVERVIEW</small><h3>Last 30 days</h3></div>
                <div className="prog-filter">30 Days <ChevronDown size={13} /></div>
              </div>
              <div className="prog-big"><strong>+12.4%</strong><span><TrendingUp size={13} /> Overall improvement</span></div>
              <div className="prog-chart-area">
                <svg viewBox="0 0 700 200" preserveAspectRatio="none" className="prog-svg">
                  <defs>
                    <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#b7ff3c" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#b7ff3c" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0 160 C80 155,100 135,160 145 S230 110,280 125 S360 90,420 100 S490 70,540 80 S610 45,670 55 L700 30 L700 200 L0 200 Z" fill="url(#pg)" />
                  <path d="M0 160 C80 155,100 135,160 145 S230 110,280 125 S360 90,420 100 S490 70,540 80 S610 45,670 55 L700 30" fill="none" stroke="#b7ff3c" strokeWidth="2.5" className="chart-draw" />
                  <circle cx="700" cy="30" r="4" fill="#b7ff3c" className="chart-dot" />
                </svg>
              </div>
            </div>

            {/* Side cards */}
            <div className="prog-side">
              <div className="prog-goal" data-reveal data-delay={1}>
                <div className="prog-goal-top">
                  <div><small>GOAL PROGRESS</small><h4>Build Strength</h4></div>
                  <div className="prog-ring"><strong>78</strong><small>%</small></div>
                </div>
                <div className="prog-goal-bar"><div style={{ width: "78%" }} /></div>
                <p>22% remaining to reach your monthly volume goal.</p>
              </div>

              <div className="prog-form" data-reveal data-delay={2}>
                <div className="prog-form-top"><span>AI FORM SCORE</span><span className="prog-up">+8%</span></div>
                <div className="prog-form-body"><strong>92</strong><div><span>Excellent</span><small>vs. last month</small></div></div>
                <div className="prog-form-bars">
                  {[40, 52, 48, 64, 59, 74, 68, 82, 78, 92].map((h, i) => <div key={i} style={{ height: `${h}%` }} />)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="section how-sect" id="how-it-works">
        <div className="container">
          <div className="section-head-center" data-reveal>
            <div className="section-label">SIMPLE 6-STEP WORKFLOW</div>
            <h2 className="section-title" style={{ textAlign: "center" }}>HOW <span className="grad-text">FIT-TRACK</span> WORKS</h2>
            <p className="section-desc" style={{ textAlign: "center", margin: "18px auto 0" }}>
              From gym enrollment to AI-assisted form refinement in 6 seamless steps.
            </p>
          </div>
          <div className="steps-grid">
            {steps.map((s, i) => (
              <div className="step-card" key={s.n} data-reveal data-delay={i}>
                <div className="step-num">{s.n}</div>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="cta-sect">
        <div className="cta-glow" />
        <div className="container">
          <div className="cta-box" data-reveal>
            <div className="section-label">START TODAY</div>
            <h2>YOUR STRONGER SELF<br /><span className="grad-text">STARTS HERE.</span></h2>
            <p>Train with purpose. Move with confidence. Track every step forward.</p>
            {isAuthenticated && user ? (
              <Link to={`/${user.role}`} className="btn btn-primary">{user.role.toUpperCase()} Dashboard <ArrowRight size={17} /></Link>
            ) : (
              <Link to="/signup" className="btn btn-primary">Get Started <ArrowRight size={17} /></Link>
            )}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="footer" data-reveal>
        <div className="container footer-inner">
          <div className="footer-brand">
            <Link to="/" className="brand"><span className="brand-icon"><Activity size={18} /></span><span>FIT-TRACK</span></Link>
            <p>A Smart Fitness Companion.<br />Train smarter. Move better.</p>
          </div>
          <div className="footer-links">
            <div>
              <span>PRODUCT</span>
              <a href="#features">Features</a>
              <a href="#ai">AI Coach</a>
              <a href="#about">Progress</a>
              <a href="#how-it-works">How It Works</a>
            </div>
            <div>
              <span>ACCOUNT</span>
              <Link to="/login">Login</Link>
              <Link to="/signup">Get Started</Link>
            </div>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© 2026 FIT-TRACK. All rights reserved.</span>
          <span>Built for smarter training.</span>
        </div>
      </footer>
    </div>
  );
}