import {
  Activity,
  ArrowRight,
  Check,
  LockKeyhole,
  Mail,
  Phone,
  User,
  Ruler,
  Weight,
  AlertCircle,
  Loader2,
  Dumbbell,
  Award,
  Briefcase,
  Sparkles,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

import { useAuth } from "../context/AuthContext";

const goals = [
  {
    id: "muscle",
    title: "Build Muscle",
    description: "Strength & size",
  },
  {
    id: "weight-loss",
    title: "Lose Weight",
    description: "Fat loss & fitness",
  },
  {
    id: "fitness",
    title: "Improve Fitness",
    description: "Strength & endurance",
  },
  {
    id: "active",
    title: "Stay Active",
    description: "Healthy lifestyle",
  },
];

const trainerSpecialties = [
  {
    id: "Strength & Hypertrophy",
    title: "Strength & Hypertrophy",
    description: "Bodybuilding, muscle mass & progressive overload",
  },
  {
    id: "Functional & Fat Loss",
    title: "Functional & Fat Loss",
    description: "High-intensity metabolic conditioning & recomposition",
  },
  {
    id: "Calisthenics & Mobility",
    title: "Calisthenics & Mobility",
    description: "Bodyweight mastery, joint mobility & core control",
  },
  {
    id: "Powerlifting & Athletics",
    title: "Powerlifting & Athletics",
    description: "Compound lifts (SBD) & athletic performance",
  },
];

const experienceOptions = [
  "1-2 years",
  "3-5 years",
  "5-8 years",
  "8+ years (Senior Coach)",
];

export default function Signup() {
  const navigate = useNavigate();
  const { user, signup } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "member", // "member" or "trainer"
    specialty: "Strength & Hypertrophy",
    experience: "3-5 years",
    age: "",
    height: "",
    weight: "",
    goal: "muscle",
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.role) {
      if (user.role === "admin") navigate("/admin", { replace: true });
      else if (user.role === "trainer") navigate("/trainer", { replace: true });
      else navigate("/member", { replace: true });
    }
  }, [user, navigate]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const newUser = await signup(form);
      if (newUser?.role === "trainer" || form.role === "trainer") {
        navigate("/trainer", { replace: true });
      } else {
        navigate("/member", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Registration failed. Please check your details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="signup-page">

      <div className="signup-side-panel">

        <Link
          to="/"
          className="signup-brand"
        >
          <span>
            <Activity size={18} />
          </span>

          FIT-TRACK
        </Link>

        <div className="signup-side-content">

          <span className="signup-side-label">
            {form.role === "trainer" ? "COACH COMMAND PORTAL" : "YOUR FITNESS. YOUR DATA."}
          </span>

          <h1>
            {form.role === "trainer" ? "COACH & ELEVATE" : "START YOUR"}
            <br />
            <span>{form.role === "trainer" ? "ATHLETES TODAY." : "FITNESS JOURNEY."}</span>
          </h1>

          <p>
            {form.role === "trainer"
              ? "Design bespoke athletic routines, inspect live member biomechanics, and manage client attendance."
              : "Build better habits, understand your movement and see your progress become measurable."}
          </p>

          <div className="signup-benefits">

            {(form.role === "trainer"
              ? [
                  "Client workout split assignment",
                  "AI-assisted posture audit review",
                  "Athlete consistency & attendance",
                ]
              : [
                  "Personalized workout tracking",
                  "AI-assisted form analysis",
                  "Smart progress insights",
                ]
            ).map((item) => (
              <div key={item}>
                <span>
                  <Check size={11} />
                </span>

                {item}
              </div>
            ))}

          </div>

        </div>

      </div>

      <div className="signup-form-side">

        <div className="signup-form-wrapper">

          <div className="signup-mobile-brand">
            <Activity size={18} />
            FIT-TRACK
          </div>

          <div className="signup-heading">

            <div className="auth-small-label">
              {form.role === "trainer" ? "COACH REGISTRATION" : "CREATE ACCOUNT"}
            </div>

            <h2>
              {form.role === "trainer" ? "Join as a" : "Start your"}
              <br />
              <span>{form.role === "trainer" ? "Coach." : "journey."}</span>
            </h2>

            <p>
              {form.role === "trainer"
                ? "Create your certified trainer account to manage clients and programs."
                : "Create your member account in less than a minute."}
            </p>

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

          {/* Account Role Selector */}
          <div className="role-switch-container mb-4" style={{ marginBottom: "20px" }}>
            <label className="form-label" style={{ marginBottom: "8px", display: "block", fontSize: "11px", letterSpacing: "0.05em", color: "#8a9e8d" }}>
              SELECT ACCOUNT TYPE:
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <button
                type="button"
                className={`role-tab-btn ${form.role === "member" ? "active" : ""}`}
                style={{
                  padding: "12px 14px",
                  borderRadius: "10px",
                  border: form.role === "member" ? "1px solid #b7ff3c" : "1px solid rgba(255,255,255,0.08)",
                  background: form.role === "member" ? "rgba(183, 255, 60, 0.12)" : "rgba(255,255,255,0.03)",
                  color: form.role === "member" ? "#b7ff3c" : "#8a9e8d",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  fontSize: "13px",
                }}
                onClick={() => updateField("role", "member")}
              >
                <User size={16} />
                Gym Member
              </button>

              <button
                type="button"
                className={`role-tab-btn ${form.role === "trainer" ? "active" : ""}`}
                style={{
                  padding: "12px 14px",
                  borderRadius: "10px",
                  border: form.role === "trainer" ? "1px solid #00f2fe" : "1px solid rgba(255,255,255,0.08)",
                  background: form.role === "trainer" ? "rgba(0, 242, 254, 0.12)" : "rgba(255,255,255,0.03)",
                  color: form.role === "trainer" ? "#00f2fe" : "#8a9e8d",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  fontSize: "13px",
                }}
                onClick={() => updateField("role", "trainer")}
              >
                <Dumbbell size={16} />
                Coach / Trainer
              </button>
            </div>
          </div>

          <form
            className="signup-form"
            onSubmit={handleSubmit}
          >

            <div className="signup-grid">

              <div className="form-group full-width">

                <label className="form-label">
                  Full name
                </label>

                <div className="input-with-icon">
                  <User size={15} />

                  <input
                    className="form-input"
                    placeholder="Alex Morgan"
                    value={form.name}
                    onChange={(e) =>
                      updateField(
                        "name",
                        e.target.value
                      )
                    }
                    required
                  />
                </div>

              </div>

              <div className="form-group">

                <label className="form-label">
                  Email
                </label>

                <div className="input-with-icon">
                  <Mail size={15} />

                  <input
                    className="form-input"
                    type="email"
                    placeholder="alex@email.com"
                    value={form.email}
                    onChange={(e) =>
                      updateField(
                        "email",
                        e.target.value
                      )
                    }
                    required
                  />
                </div>

              </div>

              <div className="form-group">

                <label className="form-label">
                  Phone
                </label>

                <div className="input-with-icon">
                  <Phone size={15} />

                  <input
                    className="form-input"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={(e) =>
                      updateField(
                        "phone",
                        e.target.value
                      )
                    }
                  />
                </div>

              </div>

              <div className="form-group full-width">

                <label className="form-label">
                  Password
                </label>

                <div className="input-with-icon">
                  <LockKeyhole size={15} />

                  <input
                    className="form-input"
                    type="password"
                    placeholder="Create a strong password"
                    value={form.password}
                    onChange={(e) =>
                      updateField(
                        "password",
                        e.target.value
                      )
                    }
                    required
                  />
                </div>

              </div>

              {form.role === "trainer" ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Coaching Experience</label>
                    <div className="input-with-icon">
                      <Briefcase size={15} />
                      <select
                        className="form-input"
                        value={form.experience}
                        onChange={(e) => updateField("experience", e.target.value)}
                        style={{ background: "#151816", color: "#fff" }}
                      >
                        {experienceOptions.map((opt) => (
                          <option key={opt} value={opt} style={{ background: "#151816" }}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Primary Coaching Specialty</label>
                    <div className="input-with-icon">
                      <Award size={15} />
                      <select
                        className="form-input"
                        value={form.specialty}
                        onChange={(e) => updateField("specialty", e.target.value)}
                        style={{ background: "#151816", color: "#fff" }}
                      >
                        {trainerSpecialties.map((s) => (
                          <option key={s.id} value={s.id} style={{ background: "#151816" }}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label className="form-label">Age</label>
                    <input
                      className="form-input"
                      type="number"
                      placeholder="21"
                      value={form.age}
                      onChange={(e) => updateField("age", e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Height</label>
                    <div className="input-with-icon">
                      <Ruler size={15} />
                      <input
                        className="form-input"
                        type="number"
                        placeholder="175 cm"
                        value={form.height}
                        onChange={(e) => updateField("height", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Weight</label>
                    <div className="input-with-icon">
                      <Weight size={15} />
                      <input
                        className="form-input"
                        type="number"
                        placeholder="70 kg"
                        value={form.weight}
                        onChange={(e) => updateField("weight", e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

            </div>

            {form.role === "trainer" ? (
              <div className="goal-selection">
                <label className="form-label">
                  What is your primary coaching focus?
                </label>

                <div className="goal-grid">
                  {trainerSpecialties.map((spec) => (
                    <button
                      type="button"
                      key={spec.id}
                      className={
                        form.specialty === spec.id
                          ? "goal-option active"
                          : "goal-option"
                      }
                      onClick={() => updateField("specialty", spec.id)}
                    >
                      <span className="goal-radio">
                        {form.specialty === spec.id && <span />}
                      </span>

                      <span>
                        <strong>{spec.title}</strong>
                        <small>{spec.description}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="goal-selection">
                <label className="form-label">
                  What's your primary goal?
                </label>

                <div className="goal-grid">
                  {goals.map((goal) => (
                    <button
                      type="button"
                      key={goal.id}
                      className={
                        form.goal === goal.id
                          ? "goal-option active"
                          : "goal-option"
                      }
                      onClick={() => updateField("goal", goal.id)}
                    >
                      <span className="goal-radio">
                        {form.goal === goal.id && <span />}
                      </span>

                      <span>
                        <strong>{goal.title}</strong>
                        <small>{goal.description}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              className="btn btn-primary signup-submit"
              type="submit"
              disabled={isSubmitting}
              style={{ justifyContent: "center" }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Creating {form.role === "trainer" ? "Coach" : "Member"} Account...
                </>
              ) : (
                <>
                  Create {form.role === "trainer" ? "Coach" : "Member"} Account
                  <ArrowRight size={17} />
                </>
              )}
            </button>

          </form>

          <p className="signup-login">
            Already have an account?
            <Link to="/login">
              Sign in
            </Link>
          </p>

        </div>

      </div>

    </div>
  );
}