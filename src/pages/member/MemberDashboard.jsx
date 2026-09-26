import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Flame,
  Dumbbell,
  Award,
  Clock,
  ArrowRight,
  Brain,
  CheckCircle2,
  Sparkles,
  Banknote,
  MessageSquare,
  QrCode,
  Camera,
  UserCheck,
  TrendingUp,
  Activity,
  Calendar,
  ChevronRight,
  ShieldCheck,
  Play,
} from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import StatCard from "../../components/StatCard";
import ProgressChart from "../../components/ProgressChart";
import ThreeBiomechanics from "../../components/ThreeBiomechanics";
import AskAIButton from "../../components/AskAIButton";
import { useAuth } from "../../context/AuthContext";
import {
  getMemberships,
  getAssignedWorkout,
  requestMembership,
  getMemberAttendanceRecord,
  getMemberProgressMetrics,
  calculateDaysRemaining,
  formatExpiryRemaining,
  getMemberLatestAISetSummary,
} from "../../services/mockData";

export default function MemberDashboard() {
  const { user } = useAuth();
  const userName = user?.name || "Member";

  const [metrics, setMetrics] = useState(() =>
    getMemberProgressMetrics(userName, user)
  );

  const [membershipData, setMembershipData] = useState(() => {
    const allMemberships = getMemberships();
    return allMemberships.find(
      (m) =>
        m.memberName?.toLowerCase() === userName.toLowerCase() ||
        m.memberEmail === user?.email
    ) || {
      plan: user?.membership || "PRO",
      status: user?.membershipStatus || "pending",
      paymentMethod: "Cash",
      endDate: "20 March 2027",
    };
  });
  const [workout, setWorkout] = useState(() => getAssignedWorkout(userName));
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("PRO");
  const [assignedCoach, setAssignedCoach] = useState(() => user?.trainerName || null);
  const [attendanceRate, setAttendanceRate] = useState(() => {
    const rec = getMemberAttendanceRecord(userName);
    return rec?.attendanceRate ?? user?.attendance ?? 0;
  });

  useEffect(() => {
    const allMemberships = getMemberships();
    const myMem = allMemberships.find(
      (m) =>
        m.memberName?.toLowerCase() === userName.toLowerCase() ||
        m.memberEmail === user?.email
    );
    if (myMem) setMembershipData(myMem);
    const myWorkout = getAssignedWorkout(userName);
    if (myWorkout) setWorkout(myWorkout);

    if (user?.trainerName) {
      setAssignedCoach(user.trainerName);
    }

    const checkCoach = async () => {
      try {
        const api = (await import("../../services/api")).default;
        const res = await api.get("/chat/contacts");
        if (res.data?.success && res.data?.contacts?.length > 0) {
          setAssignedCoach(res.data.contacts[0].name);
          return;
        }
      } catch {
        // fallback
      }
      const { getTrainersList, getMembersList } = await import("../../services/mockData");
      const members = getMembersList();
      const current = members.find((m) => m.email === user?.email || m.name === user?.name);
      if (current?.trainerName) {
        setAssignedCoach(current.trainerName);
      } else if (current?.trainerId) {
        const trainers = getTrainersList();
        const t = trainers.find((tr) => tr.id === current.trainerId || tr._id === current.trainerId);
        if (t) setAssignedCoach(t.name);
      }
    };
    checkCoach();

    const handleWorkoutSync = () => {
      const myWorkout = getAssignedWorkout(userName);
      if (myWorkout) setWorkout({ ...myWorkout });
    };

    const handleAttendanceSync = () => {
      const rec = getMemberAttendanceRecord(userName);
      if (rec?.attendanceRate !== undefined) {
        setAttendanceRate(rec.attendanceRate);
      }
    };
    handleAttendanceSync();

    const handleProgressSync = () => {
      const fresh = getMemberProgressMetrics(userName, user);
      setMetrics({ ...fresh });
      if (fresh.attendance !== undefined) {
        setAttendanceRate(fresh.attendance);
      }
    };
    handleProgressSync();

    window.addEventListener("fittrack:assignment-changed", checkCoach);
    window.addEventListener("fittrack:workout-changed", handleWorkoutSync);
    window.addEventListener("fittrack:workout-completed", handleProgressSync);
    window.addEventListener("fittrack:progress-updated", handleProgressSync);
    window.addEventListener("fittrack:ai-set-summary-updated", handleProgressSync);
    window.addEventListener("fittrack:ai-set-summary-cleared", handleProgressSync);
    window.addEventListener("fittrack:attendance-changed", handleAttendanceSync);
    window.addEventListener("storage", handleProgressSync);
    return () => {
      window.removeEventListener("fittrack:assignment-changed", checkCoach);
      window.removeEventListener("fittrack:workout-changed", handleWorkoutSync);
      window.removeEventListener("fittrack:workout-completed", handleProgressSync);
      window.removeEventListener("fittrack:progress-updated", handleProgressSync);
      window.removeEventListener("fittrack:ai-set-summary-updated", handleProgressSync);
      window.removeEventListener("fittrack:ai-set-summary-cleared", handleProgressSync);
      window.removeEventListener("fittrack:attendance-changed", handleAttendanceSync);
      window.removeEventListener("storage", handleProgressSync);
    };
  }, [userName, user]);

  const handleRequestMembership = (planName) => {
    const newReq = requestMembership(userName, user?.email || "", planName);
    setMembershipData(newReq);
    setShowRequestModal(false);
  };

  const isPending = membershipData?.status === "pending";
  const isActive = membershipData?.status === "active";

  const latestAiSet = metrics.latestAiSetSummary || user?.latestAiSetSummary || getMemberLatestAISetSummary(userName);

  const hasRealAiSessions =
    (Array.isArray(metrics.formHistory) &&
      metrics.formHistory.length > 0 &&
      metrics.formScore !== null) ||
    Boolean(latestAiSet);

  const curWeight = metrics.weight || user?.weight || 60;
  const tgtWeight = metrics.targetWeight || user?.targetWeight || (curWeight > 65 ? curWeight - 5 : curWeight + 5);

  const todayDateFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <DashboardLayout
      title={`Good morning, ${userName}`}
      subtitle={`${todayDateFormatted} • Ready to crush today's training?`}
    >
      <div className="athlete-dashboard-container">
        {/* ATHLETE HERO BANNER & GYM PASS */}
        <section className={`athlete-hero-card ${isActive ? "active" : isPending ? "pending" : "expired"}`}>
          <div className="athlete-hero-left">
            <div className="athlete-status-strip">
              <span className={`athlete-status-badge ${isActive ? "active" : isPending ? "pending" : "expired"}`}>
                <span className="dot" />
                {isActive ? "Active Gym Member" : isPending ? "Verification Pending" : "Plan Expired"}
              </span>

              <span className="athlete-plan-pill">{membershipData?.plan || "PRO"} PASS</span>
            </div>

            <h2 className="athlete-hero-heading">
              {isActive
                ? `Welcome back to the gym floor, ${userName}!`
                : isPending
                ? "Payment Verification Underway"
                : "Membership Renewal Required"}
            </h2>

            <p className="athlete-hero-sub">
              {isPending
                ? "Cash payment recorded for front desk verification. Your full access will activate shortly."
                : (() => {
                    const days = calculateDaysRemaining(membershipData?.endDate);
                    if (days < 0) return "Your pass has expired. Please visit the reception desk to renew.";
                    if (days === 0) return "Expires today! Please renew at the front desk to avoid interruption.";
                    return `${formatExpiryRemaining(membershipData?.endDate)} remaining • Full access to gym floor & AI Form Coach`;
                  })()}
            </p>
          </div>

          <div className="athlete-hero-right">
            <Link to="/check-in" className="btn btn-primary btn-sm flex items-center gap-2">
              <QrCode size={15} />
              <span>Turnstile QR Pass</span>
            </Link>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowRequestModal(true)}
            >
              Change Plan
            </button>
          </div>
        </section>

        {/* THUMB-FRIENDLY QUICK ATHLETIC ACTIONS (MOBILE-FIRST) */}
        <section className="athlete-quick-actions-bar">
          <Link to="/member/workout" className="athlete-action-btn highlight">
            <div className="action-icon-wrap">
              <Dumbbell size={16} />
            </div>
            <div className="action-text-wrap">
              <strong>Start Workout</strong>
              <small>{workout?.name ? "Today's Routine" : "Log Exercises"}</small>
            </div>
          </Link>

          <Link to="/member/ai-coach" className="athlete-action-btn">
            <div className="action-icon-wrap vision">
              <Camera size={16} />
            </div>
            <div className="action-text-wrap">
              <strong>AI Form Coach</strong>
              <small>Live Reps & Pose</small>
            </div>
          </Link>

          <Link to="/member/nutricoach" className="athlete-action-btn">
            <div className="action-icon-wrap nutrition">
              <Brain size={16} />
            </div>
            <div className="action-text-wrap">
              <strong>NutriCoach AI</strong>
              <small>Macros & Diet</small>
            </div>
          </Link>

          <Link to="/check-in" className="athlete-action-btn">
            <div className="action-icon-wrap checkin">
              <QrCode size={16} />
            </div>
            <div className="action-text-wrap">
              <strong>Gym Pass</strong>
              <small>QR Check-In</small>
            </div>
          </Link>

          <Link to="/member/chat" className="athlete-action-btn">
            <div className="action-icon-wrap chat">
              <MessageSquare size={16} />
            </div>
            <div className="action-text-wrap">
              <strong>Coach Chat</strong>
              <small>{assignedCoach || "Personal Trainer"}</small>
            </div>
          </Link>
        </section>

        {/* 4 CORE DAILY ATHLETIC METRICS TILES */}
        <section className="athlete-metrics-grid">
          <StatCard
            icon={Flame}
            label="BODY WEIGHT"
            value={curWeight}
            unit="kg"
            change={`Goal: ${tgtWeight} kg`}
            positive={true}
            accent="green"
          />

          <StatCard
            icon={Clock}
            label="ATTENDANCE RATE"
            value={metrics.attendance ?? attendanceRate ?? 0}
            unit="%"
            change="Verified check-ins"
            positive={true}
            accent="cyan"
          />

          <StatCard
            icon={Dumbbell}
            label="COMPLETED SESSIONS"
            value={metrics.workoutsCount ?? user?.workoutsCount ?? 0}
            unit="workouts"
            change={metrics.isTodayCompleted ? "✓ Finished Today" : "Assigned split"}
            positive={true}
            accent="green"
          />

          <StatCard
            icon={Award}
            label="AI FORM PRECISION"
            value={latestAiSet ? `${latestAiSet.formScore}%` : hasRealAiSessions ? `${metrics.formScore}%` : "Ready"}
            unit=""
            change={latestAiSet ? `${latestAiSet.exercise} (${latestAiSet.reps} reps)` : hasRealAiSessions ? "Average Score" : "Test Movement"}
            positive={true}
            accent="green"
          />
        </section>

        {/* 2-COLUMN MAIN ATHLETIC WORKOUT & PROGRESSION CARDS */}
        <div className="dash-grid-2 mt-4">
          {/* TODAY'S ASSIGNED WORKOUT ROUTINE */}
          <div className="athlete-card">
            <div className="athlete-card-header">
              <div>
                <span className="athlete-card-badge">TODAY'S WORKOUT</span>
                <h3 className="athlete-card-title">{workout?.name || "Full Body Power Routine"}</h3>
              </div>

              <div className="flex items-center gap-2">
                {workout?.exercises && workout.exercises.length > 0 && workout.exercises.every((e) => e.completed) ? (
                  <span className="badge badge-green flex items-center gap-1 font-bold">
                    <CheckCircle2 size={13} /> ✓ Completed
                  </span>
                ) : (
                  <span className="badge badge-secondary text-xs">
                    {assignedCoach ? `Coach: ${assignedCoach}` : "Custom Split"}
                  </span>
                )}
                <AskAIButton
                  prompt={`Analyze today's workout (${workout?.name || "Gym Routine"}) and give me optimal rest intervals and warmup sets`}
                  label="Ask AI"
                  size="xs"
                />
              </div>
            </div>

            <p className="athlete-card-desc">
              {workout?.exercises && workout.exercises.length > 0 && workout.exercises.every((e) => e.completed)
                ? "✓ All exercises completed for today! Your coach has received your workout log."
                : workout?.name
                ? "Targeted hypertrophy & progressive overload routine assigned for today."
                : "Follow your assigned training split or log custom sets."}
            </p>

            {/* Exercise Checklist */}
            <div className="athlete-exercise-list">
              {!workout?.exercises || workout.exercises.length === 0 ? (
                <div className="py-6 text-center text-muted text-xs">
                  <p>No workout assigned for today.</p>
                  <Link to="/member/workout" className="text-green hover:underline mt-1 inline-block font-semibold">
                    + Create or log a routine
                  </Link>
                </div>
              ) : (
                workout.exercises.map((ex) => (
                  <div key={ex.id} className={`athlete-exercise-item ${ex.completed ? "completed" : ""}`}>
                    <div className="exercise-info-left">
                      <div className="exercise-check-indicator">
                        {ex.completed ? <CheckCircle2 size={16} className="text-green" /> : <div className="dot-hollow" />}
                      </div>
                      <div>
                        <h4 className="exercise-name">{ex.name}</h4>
                        <span className="exercise-meta text-xs text-muted">
                          {ex.sets} sets × {ex.reps} reps {ex.weight ? `• ${ex.weight} kg` : ""}
                        </span>
                      </div>
                    </div>

                    <span className={`exercise-badge ${ex.completed ? "done" : ""}`}>
                      {ex.completed ? "Completed" : `${ex.sets} × ${ex.reps}`}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Card Action Footer */}
            <div className="athlete-card-footer mt-4 flex gap-2.5">
              <Link to="/member/workout" className="btn btn-primary flex-1">
                <Play size={15} />
                <span>
                  {workout?.exercises && workout.exercises.length > 0 && workout.exercises.every((e) => e.completed)
                    ? "View Workout Log"
                    : "Start Workout"}
                </span>
              </Link>
              <Link to="/member/ai-coach" className="btn btn-secondary flex-1">
                <Camera size={15} />
                <span>Form Check</span>
              </Link>
            </div>
          </div>

          {/* BODY TRANSFORMATION & WEIGHT TREND */}
          <div className="athlete-card">
            <div className="athlete-card-header">
              <div>
                <span className="athlete-card-badge">TRANSFORMATION</span>
                <h3 className="athlete-card-title">Weight & Progression Trend</h3>
              </div>

              <div className="flex items-center gap-2">
                <AskAIButton
                  prompt="Review my recent weight progression data and tell me if my rate of progress is optimal for my fitness goal"
                  label="Ask AI"
                  size="xs"
                />
                <Link to="/member/progress" className="text-green text-xs font-bold hover:underline">
                  All Charts →
                </Link>
              </div>
            </div>

            <ProgressChart
              title="Body Weight (kg)"
              data={
                metrics.weightHistory && metrics.weightHistory.length > 0
                  ? metrics.weightHistory
                  : user?.weightHistory && user.weightHistory.length > 0
                  ? user.weightHistory
                  : user?.weight
                  ? [{ name: "Current", value: Number(user.weight) }]
                  : [{ name: "Week 1", value: 68 }, { name: "Week 2", value: 69 }, { name: "Current", value: Number(curWeight) }]
              }
            />

            {/* Milestone Goal Tracker */}
            <div className="athlete-milestone-box mt-3">
              <div className="milestone-icon">
                <TrendingUp size={18} className="text-green" />
              </div>
              <div className="milestone-info">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-white">Goal Milestone</span>
                  <span className="text-green font-mono">{curWeight} kg / {tgtWeight} kg</span>
                </div>
                <div className="milestone-bar-bg mt-1.5">
                  <div
                    className="milestone-bar-fill"
                    style={{
                      width: `${Math.min(100, Math.max(15, Math.round((curWeight / tgtWeight) * 100)))}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-muted mt-1.5">
                  {user?.targetWeight
                    ? `Current weight is ${curWeight} kg. Working towards your target of ${tgtWeight} kg.`
                    : `Set your target weight goal in your profile to enable automatic progress forecasting.`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* AI COACH BIOMECHANICAL INSIGHT SUMMARY CARD */}
        {latestAiSet && (
          <section className="athlete-ai-insight-card mt-4">
            <div className="ai-insight-header">
              <div className="flex items-center gap-2">
                <div className="ai-insight-icon">
                  <Award size={18} className="text-green" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {latestAiSet.headline || `${latestAiSet.exercise}: ${latestAiSet.reps} Reps Finished`}
                  </h4>
                  <p className="text-xs text-muted">
                    Form precision scored at <strong className="text-green">{latestAiSet.formScore}%</strong> • Synced with your training log
                  </p>
                </div>
              </div>

              <Link to="/member/ai-coach" className="btn btn-secondary btn-xs flex items-center gap-1">
                <span>Perform New Set</span>
                <ChevronRight size={13} />
              </Link>
            </div>
          </section>
        )}

        {/* 3D ANATOMICAL BIOMECHANICS & MOVEMENT TARGETING */}
        <section className="mt-4">
          <ThreeBiomechanics targetMuscle="Chest" />
        </section>

        {/* MEMBERSHIP PLAN CHANGE MODAL */}
        {showRequestModal && (
          <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Select Membership Pass</h3>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setShowRequestModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="plan-selection-grid mt-4">
                {[
                  { name: "BASIC", price: "₹999", perks: "Full gym floor access + cardio zone + free weights" },
                  { name: "PRO", price: "₹1,999", perks: "All facilities + AI Form Coach + Locker + NutriCoach AI" },
                  { name: "PREMIUM", price: "₹2,999", perks: "1-on-1 Personal Trainer + Full AI Biomechanics & Custom Diets" },
                ].map((p) => (
                  <div
                    key={p.name}
                    className={`plan-modal-card ${selectedPlan === p.name ? "active" : ""}`}
                    onClick={() => setSelectedPlan(p.name)}
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-white">{p.name} PASS</h4>
                      <span className="text-green font-bold">{p.price}/mo</span>
                    </div>
                    <p className="text-muted text-xs mt-1">{p.perks}</p>
                    <div className="payment-notice mt-2 text-xs">
                      <Banknote size={13} className="inline mr-1 text-green" />
                      Payment Method: <strong>Cash at Gym Reception Desk</strong>
                    </div>
                  </div>
                ))}
              </div>

              <div className="modal-footer mt-4">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRequestModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleRequestMembership(selectedPlan)}
                >
                  Submit Cash Request
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
