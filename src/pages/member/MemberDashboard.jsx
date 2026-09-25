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
    // Keep synchronized with external changes
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

  return (
    <DashboardLayout
      title={`Good Morning, ${userName} 👋`}
      subtitle="Track your workouts, log nutrition, and monitor biomechanical progress."
    >
      {/* TOP NOTIFICATION / MEMBERSHIP STATUS BANNER (Section 8) */}
      <div className={`membership-banner ${isActive ? "active" : isPending ? "pending" : "expired"}`}>
        <div className="membership-banner-left">
          <div className="flex items-center gap-2">
            <span
              className={`status-pill ${
                isActive ? "active" : isPending ? "pending" : "expired"
              }`}
            >
              <span className="dot" />
              {isActive
                ? "Active Membership"
                : isPending
                ? "Verification in Progress"
                : "Plan Expired"}
            </span>

            {/* Plan Badge */}
            <span className="badge badge-primary">{membershipData?.plan || "PRO"} PLAN</span>
          </div>

          <h3 className="text-base font-bold mt-1 text-white">
            {isActive
              ? `You're on the ${membershipData?.plan || "PRO"} Plan`
              : isPending
              ? "Payment Verification Pending"
              : "Membership Needs Renewal"}
          </h3>

          {/* Verification / Renewal Subtext */}
          {isPending ? (
            <p className="text-xs text-muted mt-0.5">
              Cash payment submitted for <strong>{membershipData?.plan || "PRO"} Plan</strong>. Admin confirmation usually takes 1-2 hours.
            </p>
          ) : (
            <p className="text-xs text-muted mt-0.5">
              {(() => {
                const days = calculateDaysRemaining(membershipData?.endDate);
                if (days < 0) return "Membership expired. Please renew to continue.";
                if (days === 0) return "Expires today! Please renew at the front desk.";
                return `${formatExpiryRemaining(membershipData?.endDate)} • Access to all facilities and AI Form Coach`;
              })()}
            </p>
          )}
        </div>

        <div className="membership-banner-right">
          {isPending ? (
            <div className="pending-status-chip">
              <Clock size={16} className="text-warning animate-pulse" />
              <span>Verification Pending</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <AskAIButton size="sm" />
              <Link
                to="/check-in"
                className="btn btn-primary btn-sm flex items-center gap-1.5"
              >
                <QrCode size={14} />
                <span>Turnstile Pass</span>
              </Link>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowRequestModal(true)}
              >
                Change Plan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* YOUR FITNESS STATS (Section 8 of Specification) */}
      <div className="dash-section-header mt-4">
        <h4>YOUR FITNESS</h4>
        <span className="text-muted text-xs">Real-time metrics & consistency</span>
      </div>

      <div className="dash-grid-4 mt-2">
        <StatCard
          icon={Flame}
          label="WEIGHT"
          value={curWeight}
          unit="kg"
          change={`Goal: ${tgtWeight} kg`}
          positive={true}
          accent="green"
        />
        <StatCard
          icon={Clock}
          label="ATTENDANCE"
          value={metrics.attendance ?? attendanceRate ?? 75}
          unit="%"
          change="Updated by coach"
          positive={true}
          accent="cyan"
        />
        <StatCard
          icon={Dumbbell}
          label="WORKOUTS"
          value={metrics.workoutsCount ?? user?.workoutsCount ?? 0}
          unit="sessions"
          change={metrics.isTodayCompleted ? "✓ Today Finished" : "Assigned sessions"}
          positive={true}
          accent="green"
        />
        <StatCard
          icon={Award}
          label="FORM SCORE"
          value={latestAiSet ? `${latestAiSet.formScore}%` : hasRealAiSessions ? `${metrics.formScore}%` : "Not Tested"}
          unit=""
          change={latestAiSet ? `${latestAiSet.exercise} (${latestAiSet.reps} reps)` : hasRealAiSessions ? "AI Pose Accuracy" : "Ready to Calibrate"}
          positive={true}
          accent="green"
        />
      </div>

      {/* 🤖 AI COACH BANNER (Section 8) */}
      <div className="ai-coach-banner mt-4">
        <div className="ai-banner-content">
          <div className="ai-badge-chip">
            <Sparkles size={14} />
            <span>
              {latestAiSet
                ? "🤖 LATEST AI FORM SET SUMMARY"
                : hasRealAiSessions
                ? "🤖 AI COACH INSIGHT"
                : "🤖 AI COMPUTER VISION • READY TO CALIBRATE"}
            </span>
          </div>

          <h3>
            {latestAiSet
              ? (latestAiSet.headline || `${latestAiSet.exercise}: ${latestAiSet.reps} Reps Finished with ${latestAiSet.formScore}% Form Accuracy`)
              : hasRealAiSessions
              ? `Average exercise form precision: ${metrics.formScore}%`
              : "Calibrate Your Lifting Form with Computer Vision"}
          </h3>

          <p>
            {latestAiSet
              ? (latestAiSet.executiveSummary || (typeof latestAiSet.summary === "string" ? latestAiSet.summary.replace(/[*#_`]/g, "").trim() : null) || `Verified ${latestAiSet.reps} repetitions of ${latestAiSet.exercise}. Form scored at ${latestAiSet.formScore}%.`)
              : hasRealAiSessions
              ? `MediaPipe Pose analysis has tracked your squat depth, spine stabilization, and movement cadence across ${metrics.formHistory.length} recorded session${metrics.formHistory.length === 1 ? "" : "s"}.`
              : "You haven't scanned your form yet. Turn on your camera to get instant computer vision biomechanical tracking — verifying movement depth, lumbar spine neutrality, and joint alignment before lifting heavy."}
          </p>

          {latestAiSet ? (
            <div className="ai-banner-features mb-3 flex flex-wrap gap-2">
              <span className="badge badge-green text-xs flex items-center gap-1 font-mono font-bold">
                <CheckCircle2 size={12} /> {latestAiSet.reps} Reps Counted
              </span>
              <span className="badge badge-cyan text-xs flex items-center gap-1 font-mono font-bold">
                <Award size={12} /> {latestAiSet.formScore}% Form Precision
              </span>
              <span className="badge badge-secondary text-xs flex items-center gap-1">
                <UserCheck size={12} className="text-green" /> Dispatched to {latestAiSet.trainerName || assignedCoach || "Coach"}
              </span>
            </div>
          ) : !hasRealAiSessions && (
            <div className="ai-banner-features mb-3 flex flex-wrap gap-2">
              <span className="badge badge-secondary text-xs flex items-center gap-1">
                <CheckCircle2 size={12} className="text-green" /> Custom Exercise Input & LLM
              </span>
              <span className="badge badge-secondary text-xs flex items-center gap-1">
                <CheckCircle2 size={12} className="text-green" /> Real-time Rep Counter
              </span>
              <span className="badge badge-secondary text-xs flex items-center gap-1">
                <CheckCircle2 size={12} className="text-green" /> Unobstructed Camera View
              </span>
            </div>
          )}

          <div className="flex gap-3">
            <Link to="/member/ai-coach" className="btn btn-primary btn-sm">
              <Brain size={16} />
              {latestAiSet ? "Perform New Set with AI" : hasRealAiSessions ? "Launch AI Form Coach" : "Start First Form Check"}
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="ai-banner-score">
          <div className={`ai-score-circle ${!latestAiSet && !hasRealAiSessions ? "ai-score-ready" : ""}`}>
            {latestAiSet ? (
              <>
                <span className="ai-score-number">{latestAiSet.formScore}%</span>
                <span className="ai-score-label font-mono">{latestAiSet.reps} REPS</span>
              </>
            ) : hasRealAiSessions ? (
              <>
                <span className="ai-score-number">{metrics.formScore}%</span>
                <span className="ai-score-label">AVG SCORE</span>
              </>
            ) : (
              <>
                <Camera size={26} className="text-green mb-0.5" />
                <span className="ai-score-label">SCAN READY</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2-Column: Today's Workout & Weight Progress */}
      <div className="dash-grid-2 mt-4">
        {/* TODAY'S WORKOUT */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <span className="dash-card-badge">TODAY'S WORKOUT</span>
              <h3 className="dash-card-title">{workout?.name || "Chest + Triceps Routine"}</h3>
            </div>
            <div className="flex items-center gap-2">
              {workout?.exercises && workout.exercises.length > 0 && workout.exercises.every((e) => e.completed) ? (
                <span className="badge badge-green flex items-center gap-1">
                  <CheckCircle2 size={13} /> ✓ COMPLETED TODAY
                </span>
              ) : (
                <span className="badge badge-green">
                  {workout?.trainer ? `Trainer: ${workout.trainer}` : (assignedCoach ? `Trainer: Coach ${assignedCoach}` : "Coach: Unassigned")}
                </span>
              )}
              {workout?.name && (
                <AskAIButton
                  prompt={`Analyze today's workout (${workout?.name}) and suggest optimal progression weights and recovery`}
                  label="Ask AI"
                  size="xs"
                />
              )}
            </div>
          </div>

          <p className="dash-card-sub">
            {workout?.exercises && workout.exercises.length > 0 && workout.exercises.every((e) => e.completed)
              ? "✓ You have successfully completed today's training split. Your coach has received your workout log."
              : (workout?.name ? "Assigned routine for hypertrophy & upper body pressing power." : "Your coach will design and assign your customized training split.")}
          </p>

          <div className="dash-workout-list">
            {!workout?.exercises || workout.exercises.length === 0 ? (
              <p className="text-muted text-xs py-4 text-center">No workout routine assigned for today.</p>
            ) : (
              workout.exercises.map((ex) => (
                <div key={ex.id} className="assigned-exercise-row">
                  <div className="assigned-ex-left">
                    <div className="assigned-bullet" style={{ color: ex.completed ? "var(--green)" : "inherit" }}>
                      {ex.completed ? "✓" : "•"}
                    </div>
                    <div>
                      <h5 style={{ textDecoration: ex.completed ? "line-through" : "none", color: ex.completed ? "#9ca3af" : "#fff" }}>
                        {ex.name}
                      </h5>
                      <span className="text-muted text-xs">
                        {ex.sets} sets × {ex.reps} reps
                      </span>
                    </div>
                  </div>
                  <span className={`badge ${ex.completed ? "badge-green font-bold" : "badge-muted"}`}>
                    {ex.completed ? "✓ Done" : `${ex.sets} × ${ex.reps}`}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="dash-card-footer mt-4 flex gap-2">
            <Link to="/member/workout" className="btn btn-primary flex-1">
              <Dumbbell size={16} />
              {workout?.exercises && workout.exercises.length > 0 && workout.exercises.every((e) => e.completed) ? "View Workout Summary" : "Start Workout"}
            </Link>
            <Link to="/member/ai-coach" className="btn btn-secondary flex-1">
              <Brain size={16} />
              Start AI Form Check
            </Link>
          </div>
        </div>

        {/* Weight & Body Transformation Chart */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <span className="dash-card-badge">PROGRESSION</span>
              <h3 className="dash-card-title">Weight & Overload Trend</h3>
            </div>
            <div className="flex items-center gap-2">
              <AskAIButton
                prompt="Review my recent 5-week body weight transformation data and tell me if my rate of loss/gain is optimal"
                label="Ask AI"
                size="xs"
              />
              <Link to="/member/progress" className="text-green text-xs font-bold hover:underline">
                View All Charts →
              </Link>
            </div>
          </div>

          <ProgressChart
            title="Weight Progression (kg)"
            data={
              metrics.weightHistory && metrics.weightHistory.length > 0
                ? metrics.weightHistory
                : user?.weightHistory && user.weightHistory.length > 0
                ? user.weightHistory
                : user?.weight
                ? [{ name: "Current", value: Number(user.weight) }]
                : []
            }
          />

          <div className="dash-highlight-box mt-3">
            <div className="highlight-icon">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h4>{user?.targetWeight ? "Milestone Tracker" : "Weight Goals"}</h4>
              <p>
                {user?.weight && user?.targetWeight ? (
                  <>
                    Current: <strong>{user.weight} kg</strong> • Target: <strong>{user.targetWeight} kg</strong>.
                  </>
                ) : user?.weight ? (
                  <>
                    Current: <strong>{user.weight} kg</strong>. Set your target weight in your profile to enable milestone tracking.
                  </>
                ) : (
                  <>Set your weight and target goals in your profile to unlock progression tracking.</>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3D BIOMECHANICS & ANATOMICAL TARGETING (Production Feature) */}
      <div className="mt-4">
        <ThreeBiomechanics targetMuscle="Chest" />
      </div>

      {/* Plan Request Modal */}
      {showRequestModal && (
        <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Choose Membership Plan</h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowRequestModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="plan-selection-grid mt-4">
              {[
                { name: "BASIC", price: "₹999", perks: "Gym floor + cardio & free weights" },
                { name: "PRO", price: "₹1,999", perks: "All access + AI Form Coach + Locker" },
                { name: "PREMIUM", price: "₹2,999", perks: "1-on-1 Personal Trainer + AI Coach + Diet" },
              ].map((p) => (
                <div
                  key={p.name}
                  className={`plan-modal-card ${selectedPlan === p.name ? "active" : ""}`}
                  onClick={() => setSelectedPlan(p.name)}
                >
                  <div className="flex justify-between items-center">
                    <h4>{p.name}</h4>
                    <span className="text-green font-bold">{p.price}/mo</span>
                  </div>
                  <p className="text-muted text-xs mt-1">{p.perks}</p>
                  <div className="payment-notice mt-2">
                    <Banknote size={13} className="inline mr-1 text-green" />
                    Payment Method: <strong>CASH at Gym Desk</strong>
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-footer mt-4">
              <button
                className="btn btn-secondary"
                onClick={() => setShowRequestModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleRequestMembership(selectedPlan)}
              >
                Submit Cash Request
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
