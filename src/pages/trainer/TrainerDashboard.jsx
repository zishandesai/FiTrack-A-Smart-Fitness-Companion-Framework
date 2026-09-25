import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Dumbbell,
  AlertTriangle,
  ArrowRight,
  Plus,
  TrendingUp,
  CheckCircle2,
  Clock,
  Activity,
  Eye,
  MessageSquare,
  Trophy,
  Sparkles,
  Calendar,
  CalendarCheck,
  Check,
  X,
  Save,
} from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import StatCard from "../../components/StatCard";
import AttendanceModal from "../../components/AttendanceModal";
import {
  getMembersList,
  getMemberWorkoutStatus,
  getTrainerNotifications,
  getAssignedWorkout,
} from "../../services/mockData";

export default function TrainerDashboard() {
  const [members, setMembers] = useState(() => getMembersList());
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [notifications, setNotifications] = useState(() => getTrainerNotifications());

  const [attendanceModalAthlete, setAttendanceModalAthlete] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("fittrack_user") || "{}");
    } catch {
      return {};
    }
  })();

  const handleOpenAttendance = (athlete) => {
    setAttendanceModalAthlete(athlete);
  };

  const refreshData = async () => {
    // 1. Local data with latest workout status
    const local = getMembersList();
    setMembers([...local]);
    setNotifications(getTrainerNotifications());

    // 2. Fetch backend members if connected
    try {
      const api = (await import("../../services/api")).default;
      const res = await api.get("/members");
      if (res.data?.success && res.data?.members) {
        setMembers(
          res.data.members.map((m) => ({
            ...m,
            id: m._id || m.id,
          }))
        );
      }
    } catch {
      // Local fallback
    }
  };

  useEffect(() => {
    refreshData();

    window.addEventListener("fittrack:membership-changed", refreshData);
    window.addEventListener("fittrack:workout-changed", refreshData);
    window.addEventListener("fittrack:workout-completed", refreshData);
    window.addEventListener("fittrack:ai-set-summary-updated", refreshData);
    window.addEventListener("fittrack:ai-set-summary-cleared", refreshData);
    window.addEventListener("fittrack:assignment-changed", refreshData);
    window.addEventListener("fittrack:attendance-changed", refreshData);
    window.addEventListener("storage", refreshData);

    return () => {
      window.removeEventListener("fittrack:membership-changed", refreshData);
      window.removeEventListener("fittrack:workout-changed", refreshData);
      window.removeEventListener("fittrack:workout-completed", refreshData);
      window.removeEventListener("fittrack:ai-set-summary-updated", refreshData);
      window.removeEventListener("fittrack:ai-set-summary-cleared", refreshData);
      window.removeEventListener("fittrack:assignment-changed", refreshData);
      window.removeEventListener("fittrack:attendance-changed", refreshData);
      window.removeEventListener("storage", refreshData);
    };
  }, []);

  // Compute status stats
  const memberWorkoutStats = members.map((m) => {
    const statusInfo = getMemberWorkoutStatus(m.name || m.email);
    return {
      member: m,
      ...statusInfo,
    };
  });

  const completedTodayList = memberWorkoutStats.filter(
    (item) => item.status === "completed"
  );
  const inProgressList = memberWorkoutStats.filter(
    (item) => item.status === "in-progress"
  );
  const completedCount = completedTodayList.length;

  const needingAttention = members.filter((m) => {
    const info = getMemberWorkoutStatus(m.name || m.email);
    return m.needsAttention || (info.progress > 0 && info.progress < 50);
  });

  const latestCompleted = completedTodayList.length > 0 ? completedTodayList[0] : null;
  const latestAiSetNotif = notifications.find((n) => n.type === "ai_set_summary");

  return (
    <DashboardLayout
      title={`Welcome back, ${currentUser.name || "Coach"} 🏋️‍♂️`}
      subtitle="Your assigned athlete roster, daily workout completions, and biometric tracking."
    >
      {toastMsg && (
        <div className="save-toast-pill mb-4">
          <CheckCircle2 size={16} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Real-Time AI Form Check Notification Milestone Banner */}
      {latestAiSetNotif && (
        <div className="trainer-milestone-banner mb-4 p-3.5 rounded-xl flex items-center justify-between flex-wrap gap-3 border border-green/30 bg-green/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green/20 border border-green/40 flex items-center justify-center text-green flex-shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="badge badge-green text-xs font-bold">🤖 AI FORM CHECK COMPLETED</span>
                <span className="text-xs text-muted font-mono">
                  {latestAiSetNotif.formScore}% Form Precision • {latestAiSetNotif.reps} Reps
                </span>
              </div>
              <p className="text-xs text-white mt-0.5">
                Athlete <strong>{latestAiSetNotif.memberName}</strong> completed an AI verified set of{" "}
                <strong>{latestAiSetNotif.exercise || "Exercise"}</strong> with <strong>{latestAiSetNotif.formScore}%</strong> form accuracy!
              </p>
              {latestAiSetNotif.summary && (
                <p className="text-2xs text-muted mt-1 italic max-w-2xl line-clamp-1">
                  "{latestAiSetNotif.summary}"
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/trainer/chat"
              className="btn btn-primary btn-xs flex items-center gap-1"
            >
              <MessageSquare size={12} /> View AI Report & Chat
            </Link>
          </div>
        </div>
      )}

      {/* Real-Time Workout Completion Milestone Banner */}
      {latestCompleted && (
        <div className="trainer-milestone-banner mb-4 p-3.5 rounded-xl flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green/20 flex items-center justify-center text-green flex-shrink-0">
              <Trophy size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="badge badge-green text-xs font-bold">✓ TODAY'S SESSION FINISHED</span>
                <span className="text-xs text-muted">
                  {latestCompleted.completedAt ? `Finished at ${latestCompleted.completedAt}` : "Finished Today"}
                </span>
              </div>
              <p className="text-xs text-white mt-0.5">
                Athlete <strong>{latestCompleted.member.name}</strong> just completed today's{" "}
                <strong>{latestCompleted.workout?.name || "Chest + Triceps Routine"}</strong> (
                {latestCompleted.totalCount}/{latestCompleted.totalCount} sets completed)!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedAthlete(latestCompleted.member)}
              className="btn btn-secondary btn-xs flex items-center gap-1"
            >
              <Eye size={12} /> Inspect Routine Log
            </button>
            <Link
              to="/trainer/chat"
              className="btn btn-primary btn-xs flex items-center gap-1"
            >
              <MessageSquare size={12} /> Congratulate {latestCompleted.member.name}
            </Link>
          </div>
        </div>
      )}

      {/* 3 Core Stats */}
      <div className="dash-grid-3">
        <StatCard
          icon={Users}
          label="ASSIGNED MEMBERS"
          value={members.length}
          unit="athletes"
          change={members.length > 0 ? `${members.length} active athletes` : "None assigned"}
          positive={true}
          accent="green"
        />
        <StatCard
          icon={Dumbbell}
          label="TODAY'S WORKOUTS"
          value={`${completedCount}/${members.length || 0}`}
          unit="completed"
          change={
            completedCount === members.length && members.length > 0
              ? "100% finished today's split!"
              : `${completedCount} of ${members.length} finished today's split`
          }
          positive={completedCount > 0}
          accent={completedCount > 0 ? "green" : "cyan"}
        />
        <StatCard
          icon={AlertTriangle}
          label="MEMBERS NEEDING ATTENTION"
          value={needingAttention.length}
          unit="alerts"
          change={
            needingAttention.length > 0
              ? `${needingAttention.length} follow-ups required`
              : "All athletes on track"
          }
          positive={needingAttention.length === 0}
          accent="danger"
        />
      </div>

      {/* Action Row */}
      <div className="dash-action-bar mt-4">
        <div>
          <h3>Trainer Quick Operations</h3>
          <p className="text-muted text-xs">Assign workouts and inspect progress</p>
        </div>
        <div className="flex gap-2">
          <Link to="/trainer/assign-workout" className="btn btn-primary btn-sm">
            <Plus size={15} />
            Assign Workout
          </Link>
          <Link to="/trainer/members" className="btn btn-secondary btn-sm">
            <Users size={15} />
            View Assigned Members
          </Link>
        </div>
      </div>

      {/* Assigned Members Quick Glance & Split of the Day */}
      <div className="dash-grid-2 mt-4">
        {/* Card 1: ATHLETE ROSTER */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <span className="dash-card-badge">ATHLETE ROSTER</span>
              <h3 className="dash-card-title">Assigned Clients</h3>
            </div>
            <Link to="/trainer/members" className="text-green text-xs font-bold hover:underline">
              View All ({members.length}) →
            </Link>
          </div>

          <div className="mt-3 flex flex-col gap-3">
            {members.length === 0 ? (
              <p className="text-muted text-xs py-6 text-center">No athletes assigned yet.</p>
            ) : (
              members.map((m) => {
                const info = getMemberWorkoutStatus(m.name || m.email);
                const isCompleted = info.status === "completed";
                const isInProgress = info.status === "in-progress";

                return (
                  <div
                    key={m.name || m.id}
                    className={`client-glance-row ${isCompleted ? "completed" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="client-avatar-sm"
                        style={{
                          background: isCompleted ? "rgba(183, 255, 60, 0.2)" : undefined,
                          color: isCompleted ? "var(--green)" : undefined,
                          borderColor: isCompleted ? "var(--green)" : undefined,
                        }}
                      >
                        {m.name?.charAt(0) || "A"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold">{m.name}</h4>
                          {isCompleted && (
                            <span className="badge badge-green text-2xs flex items-center gap-0.5">
                              <CheckCircle2 size={11} /> Finished
                            </span>
                          )}
                        </div>
                        <span className="text-muted text-xs">Goal: {m.goal}</span>

                        {/* Today's Workout Status Indicator */}
                        <div className="mt-1 flex items-center gap-2">
                          {isCompleted ? (
                            <span className="text-2xs font-bold text-green flex items-center gap-1">
                              <CheckCircle2 size={12} /> Completed Today ({info.completedAt || "100%"})
                            </span>
                          ) : isInProgress ? (
                            <span className="text-2xs font-bold text-cyan flex items-center gap-1">
                              <Activity size={12} /> In Progress ({info.completedCount}/{info.totalCount} sets)
                            </span>
                          ) : (
                            <span className="text-2xs text-muted flex items-center gap-1">
                              <Clock size={12} /> Awaiting Today's Session
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className="font-bold text-sm"
                        style={{ color: isCompleted ? "var(--green)" : isInProgress ? "var(--cyan)" : "#9ca3af" }}
                      >
                        {info.progress}%
                      </span>
                      <span className="block text-muted text-2xs">Daily Progress</span>

                      {/* Mini Progress Bar */}
                      <div className="client-mini-progress-bar">
                        <div
                          className="client-mini-progress-fill"
                          style={{
                            width: `${info.progress}%`,
                            background: isCompleted ? "var(--green)" : "var(--cyan)",
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 mt-1.5 ml-auto">
                        <button
                          type="button"
                          onClick={() => handleOpenAttendance(m)}
                          className="text-2xs text-green hover:underline flex items-center gap-0.5"
                          title="Update athlete monthly attendance"
                        >
                          <CalendarCheck size={11} /> Attendance
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedAthlete(m)}
                          className="text-2xs text-cyan hover:underline flex items-center gap-0.5"
                        >
                          <Eye size={10} /> View Log
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="dash-card-footer mt-4">
            <Link to="/trainer/assign-workout" className="btn btn-secondary full-width">
              Assign Routine
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Card 2: Today's Training Split & Athlete Live Tracker */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <span className="dash-card-badge">SPLIT OF THE DAY</span>
              <h3 className="dash-card-title">Chest + Triceps Routine</h3>
            </div>
            <span className="badge badge-green">ACTIVE</span>
          </div>

          <p className="text-muted text-xs mt-1">
            Core routine currently assigned to primary hypertrophy athletes:
          </p>

          <div className="dash-workout-list mt-3">
            <div className="assigned-exercise-row">
              <span className="font-semibold text-sm">1. Bench Press</span>
              <span className="badge badge-muted">3 × 10</span>
            </div>
            <div className="assigned-exercise-row">
              <span className="font-semibold text-sm">2. Incline Press</span>
              <span className="badge badge-muted">3 × 12</span>
            </div>
            <div className="assigned-exercise-row">
              <span className="font-semibold text-sm">3. Triceps Pushdown</span>
              <span className="badge badge-muted">3 × 12</span>
            </div>
          </div>

          {/* REAL-TIME ATHLETE COMPLETION STATUS TRACKER */}
          <div className="split-roster-tracker">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xs font-bold text-muted flex items-center gap-1.5">
                <Dumbbell size={13} className="text-green" /> ATHLETE TODAY'S STATUS
              </span>
              <span className="badge badge-muted text-2xs">
                {completedCount}/{members.length} Completed
              </span>
            </div>

            {members.length === 0 ? (
              <p className="text-muted text-2xs py-2">No assigned athletes.</p>
            ) : (
              members.map((m) => {
                const info = getMemberWorkoutStatus(m.name || m.email);
                const isCompleted = info.status === "completed";
                const isInProgress = info.status === "in-progress";

                return (
                  <div key={m.name || m.id} className="split-athlete-status-row">
                    <span className="font-semibold text-white">{m.name}</span>
                    {isCompleted ? (
                      <span className="text-green font-bold text-xs flex items-center gap-1">
                        <CheckCircle2 size={13} /> Completed all 3 exercises{" "}
                        <span className="text-muted font-normal text-2xs">({info.completedAt || "Today"})</span>
                      </span>
                    ) : isInProgress ? (
                      <span className="text-cyan font-bold text-xs flex items-center gap-1">
                        <Activity size={13} /> {info.completedCount}/3 sets finished
                      </span>
                    ) : (
                      <span className="text-muted text-xs flex items-center gap-1">
                        <Clock size={13} /> Has not started yet
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="dash-highlight-box mt-3">
            <div className="highlight-icon">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <h5>AI Form Sync Enabled</h5>
              <p>Athletes using AI Form Coach are tracking real-time elbow angles and spine stability.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ATHLETE WORKOUT LOG INSPECTION MODAL */}
      {selectedAthlete && (
        <div className="modal-overlay" onClick={() => setSelectedAthlete(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="modal-header">
              <div>
                <span className="dash-card-badge">DAILY WORKOUT LOG</span>
                <h3 className="text-lg font-bold text-white mt-1">
                  {selectedAthlete.name}'s Session Breakdown
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedAthlete(null)}>
                ✕
              </button>
            </div>

            {(() => {
              const info = getMemberWorkoutStatus(selectedAthlete.name || selectedAthlete.email);
              const isCompleted = info.status === "completed";
              const exercises = info.workout?.exercises || [
                { id: 1, name: "Bench Press", sets: 3, reps: 10, completed: isCompleted },
                { id: 2, name: "Incline Press", sets: 3, reps: 12, completed: isCompleted },
                { id: 3, name: "Triceps Pushdown", sets: 3, reps: 12, completed: isCompleted },
              ];

              return (
                <div className="mt-4">
                  {/* Status Banner */}
                  <div
                    className="p-3 rounded-xl mb-3 flex items-center justify-between"
                    style={{
                      background: isCompleted ? "rgba(183, 255, 60, 0.1)" : "rgba(255, 255, 255, 0.03)",
                      border: `1px solid ${isCompleted ? "var(--green)" : "var(--border)"}`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <CheckCircle2 size={20} className="text-green" />
                      ) : (
                        <Clock size={20} className="text-muted" />
                      )}
                      <div>
                        <h5 className="font-bold text-sm text-white">
                          {isCompleted ? "✓ Workout Completed" : "Session In Progress / Pending"}
                        </h5>
                        <p className="text-2xs text-muted">
                          {info.completedAt ? `Logged at ${info.completedAt}` : `${info.completedCount}/${info.totalCount} exercises done`}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-green text-sm">{info.progress}%</span>
                  </div>

                  {/* Routine List */}
                  <div className="text-xs font-bold text-muted mb-2 uppercase">
                    Routine: {info.workout?.name || "Chest + Triceps Routine"}
                  </div>

                  <div className="flex flex-col gap-2">
                    {exercises.map((ex, index) => (
                      <div
                        key={ex.id || index}
                        className="p-2.5 rounded-lg flex items-center justify-between"
                        style={{
                          background: ex.completed ? "rgba(183, 255, 60, 0.05)" : "rgba(255, 255, 255, 0.02)",
                          border: `1px solid ${ex.completed ? "rgba(183, 255, 60, 0.25)" : "var(--border)"}`,
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          {ex.completed ? (
                            <CheckCircle2 size={16} className="text-green flex-shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-muted/50 flex-shrink-0" />
                          )}
                          <div>
                            <span
                              className="font-semibold text-sm"
                              style={{
                                textDecoration: ex.completed ? "none" : "none",
                                color: ex.completed ? "#ffffff" : "#9ca3af",
                              }}
                            >
                              {ex.name}
                            </span>
                            <span className="block text-muted text-2xs">
                              {ex.sets} sets × {ex.reps} reps
                            </span>
                          </div>
                        </div>

                        <span className={`badge ${ex.completed ? "badge-green" : "badge-muted"} text-2xs`}>
                          {ex.completed ? "✓ Finished" : "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="modal-actions mt-4 flex gap-2">
                    <Link
                      to="/trainer/chat"
                      className="btn btn-primary flex-1 flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare size={14} /> Send Message to {selectedAthlete.name}
                    </Link>
                    <button
                      onClick={() => setSelectedAthlete(null)}
                      className="btn btn-secondary flex-1"
                    >
                      Close
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ATHLETE ATTENDANCE MANAGEMENT OVERHAUL MODAL */}
      {attendanceModalAthlete && (
        <AttendanceModal
          athlete={attendanceModalAthlete}
          currentUser={currentUser}
          onClose={() => setAttendanceModalAthlete(null)}
          onSaved={(updated, msg) => {
            setToastMsg(msg);
            setTimeout(() => setToastMsg(""), 5000);
            refreshData();
          }}
        />
      )}
    </DashboardLayout>
  );
}

