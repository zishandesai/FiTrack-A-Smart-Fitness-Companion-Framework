import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Circle,
  Play,
  Pause,
  RotateCcw,
  Brain,
  ArrowRight,
  Dumbbell,
  MessageSquare,
  Sparkles,
  Trophy,
} from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import {
  getAssignedWorkout,
  getTrainersList,
  getMembersList,
  toggleExerciseCompletion,
  completeMemberWorkout,
  resetMemberWorkout,
} from "../../services/mockData";

export default function MyWorkout() {
  const { user } = useAuth();
  const userName = user?.name || "Member";

  const [workout, setWorkout] = useState(() => getAssignedWorkout(userName));
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [coach, setCoach] = useState(null);
  const [notification, setNotification] = useState("");

  useEffect(() => {
    const loaded = getAssignedWorkout(userName);
    if (loaded) setWorkout(loaded);
  }, [userName]);

  useEffect(() => {
    let resolved = null;
    if (user?.trainerName) {
      resolved = {
        name: user.trainerName,
        specialty: user.trainerSpecialty || "Strength & Hypertrophy",
      };
      setCoach(resolved);
    }

    const loadCoach = async () => {
      try {
        const api = (await import("../../services/api")).default;
        const res = await api.get("/chat/contacts");
        if (res.data?.success && res.data?.contacts?.length > 0) {
          setCoach(res.data.contacts[0]);
          return;
        }
      } catch {
        // local fallback
      }

      // Check mockData
      const trainers = getTrainersList();
      const members = getMembersList();
      const currentMem = members.find(
        (m) => m.email === user?.email || m.name === user?.name
      );
      const targetTrainerId = currentMem?.trainerId || user?.trainerId;
      const targetTrainerName = currentMem?.trainerName || user?.trainerName;

      const found = trainers.find(
        (t) =>
          t.id === targetTrainerId ||
          t._id === targetTrainerId ||
          t.name === targetTrainerName
      );

      if (found) {
        setCoach(found);
      } else if (resolved) {
        setCoach(resolved);
      }
    };

    loadCoach();

    const handleAssignment = () => {
      loadCoach();
    };
    window.addEventListener("fittrack:assignment-changed", handleAssignment);
    return () => window.removeEventListener("fittrack:assignment-changed", handleAssignment);
  }, [user]);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const resetTimer = (sec = 60) => {
    setTimerRunning(false);
    setTimerSeconds(sec);
  };

  const toggleExercise = async (id) => {
    if (!workout || !workout.exercises) return;
    const updated = toggleExerciseCompletion(userName, id);
    if (updated) {
      setWorkout({ ...updated });
      if (updated.status === "completed") {
        setNotification(`🎉 Outstanding work! All exercises completed. Coach ${updated.trainer || coach?.name || "your trainer"} has been notified in real-time!`);
      }
    }

    // Try backend sync if workout has backend ID
    try {
      if (workout._id) {
        const api = (await import("../../services/api")).default;
        await api.put(`/workouts/${workout._id}`, {
          exercises: updated.exercises,
        });
      }
    } catch {
      // Local fallback
    }
  };

  const handleCompleteAll = async () => {
    const updated = completeMemberWorkout(userName);
    if (updated) {
      setWorkout({ ...updated });
      setNotification(`🎉 Great work! Today's session is marked complete and synced to Coach ${updated.trainer || coach?.name || "your trainer"}.`);
    }

    try {
      if (workout._id) {
        const api = (await import("../../services/api")).default;
        await api.put(`/workouts/${workout._id}/complete`);
      }
    } catch {
      // Local fallback
    }
  };

  const handleResetWorkout = () => {
    const updated = resetMemberWorkout(userName);
    if (updated) {
      setWorkout({ ...updated });
      setNotification("↺ Workout session reset. Ready for a new run!");
      setTimeout(() => setNotification(""), 3000);
    }
  };

  const completedCount = workout?.exercises?.filter((ex) => ex.completed).length || 0;
  const totalCount = workout?.exercises?.length || 0;
  const isAllDone = totalCount > 0 && completedCount === totalCount;

  return (
    <DashboardLayout
      title="Today's Workout"
      subtitle="Follow your customized training split."
    >
      {/* Live Feedback Toast */}
      {notification && (
        <div className="save-toast-pill mb-4 flex items-center justify-between" style={{ background: "rgba(183, 255, 60, 0.15)", borderColor: "var(--green)" }}>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green flex-shrink-0" />
            <span className="text-xs font-semibold text-white">{notification}</span>
          </div>
          <button className="text-muted hover:text-white text-xs ml-2" onClick={() => setNotification("")}>✕</button>
        </div>
      )}

      {/* Top Banner with AI Form Check Button */}
      <div className="workout-top-banner">
        <div className="flex items-center gap-3">
          <div className="workout-badge-icon">
            <Dumbbell size={24} />
          </div>
          <div>
            <span className="dash-card-badge">ASSIGNED PROGRAM</span>
            <h2 className="text-xl font-bold">{workout?.name || "Chest + Triceps Routine"}</h2>
            <p className="text-muted text-xs mt-1">
              {workout?.trainer ? `Assigned by ${workout.trainer}` : (coach?.name ? `Coach ${coach.name}` : "Assigned routine")} • {totalCount} Exercises
            </p>
          </div>
        </div>

        <Link to="/member/ai-coach" className="btn btn-primary">
          <Brain size={17} />
          Start AI Form Check
          <ArrowRight size={15} />
        </Link>
      </div>

      {/* Completed celebration banner if finished */}
      {isAllDone && (
        <div className="workout-completed-banner mt-4 p-4 rounded-xl border border-green bg-green/10 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green/20 flex items-center justify-center text-green">
              <Trophy size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="badge badge-green text-xs font-bold">✓ TODAY'S ROUTINE COMPLETED</span>
                <span className="text-xs text-muted">• {workout.completedAt || "Finished"}</span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Awesome effort! Your coach (<strong>{workout.trainer || coach?.name || "Coach"}</strong>) can see your completion log on their Trainer Dashboard.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetWorkout}
              className="btn btn-secondary btn-xs flex items-center gap-1"
              title="Reset workout to perform again"
            >
              <RotateCcw size={12} /> Reset Routine
            </button>
            <Link
              to="/member/chat"
              className="btn btn-primary btn-xs flex items-center gap-1"
            >
              <MessageSquare size={12} /> Message Coach
            </Link>
          </div>
        </div>
      )}

      <div className="dash-grid-3 mt-4">
        {/* Main Routine (2 Columns) */}
        <div className="dash-two-cols">
          <div className="dash-card">
            <div className="dash-card-header">
              <div>
                <span className="dash-card-badge">EXERCISE LIST</span>
                <h3 className="dash-card-title">Main Work Sets</h3>
              </div>
              <span className={`dash-progress-pill ${isAllDone ? "badge-green" : ""}`}>
                {isAllDone ? "✓ 100% Completed" : `${completedCount}/${totalCount} Completed`}
              </span>
            </div>

            <div className="exercise-list mt-3">
              {!workout?.exercises || workout.exercises.length === 0 ? (
                <p className="text-muted text-sm py-8 text-center">No exercises assigned for today yet.</p>
              ) : (
                workout.exercises.map((ex, index) => (
                  <div
                    key={ex.id}
                    className={`exercise-item ${ex.completed ? "done" : ""}`}
                    onClick={() => toggleExercise(ex.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <button className="exercise-check-btn" type="button" onClick={(e) => { e.stopPropagation(); toggleExercise(ex.id); }}>
                      {ex.completed ? (
                        <CheckCircle2 size={22} className="text-green" />
                      ) : (
                        <Circle size={22} className="text-muted" />
                      )}
                    </button>

                    <div className="exercise-details">
                      <div className="flex items-center gap-2">
                        <span className="exercise-index">{index + 1}.</span>
                        <h4 className="exercise-title" style={{ textDecoration: ex.completed ? "line-through" : "none", opacity: ex.completed ? 0.8 : 1 }}>
                          {ex.name}
                        </h4>
                      </div>
                      <p className="exercise-target">
                        {ex.sets} sets × {ex.reps} reps
                      </p>
                    </div>

                    <div className="exercise-action flex items-center gap-2">
                      <Link
                        to={`/member/ai-coach?exercise=${encodeURIComponent(ex.name.toLowerCase())}`}
                        onClick={(e) => e.stopPropagation()}
                        className="btn btn-secondary btn-xs"
                        title="AI Form Analysis for this lift"
                      >
                        <Brain size={12} /> AI Check
                      </Link>
                      <span className={`exercise-pill ${ex.completed ? "badge-green font-bold" : ""}`}>
                        {ex.completed ? "Done ✓" : "Tap to complete"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Completion Action Bar */}
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-3">
              {!isAllDone ? (
                <button
                  type="button"
                  onClick={handleCompleteAll}
                  className="btn btn-primary w-full py-2.5 flex items-center justify-center gap-2 font-bold text-sm"
                >
                  <CheckCircle2 size={18} />
                  Mark Today's Workout Complete ({completedCount}/{totalCount})
                </button>
              ) : (
                <div className="w-full flex items-center justify-between bg-card/80 p-3 rounded-lg border border-green/30">
                  <span className="text-green font-bold text-xs flex items-center gap-1.5">
                    <CheckCircle2 size={16} /> All Exercises Finished! Logged to Coach.
                  </span>
                  <button
                    onClick={handleResetWorkout}
                    className="text-xs text-muted hover:text-white flex items-center gap-1"
                  >
                    <RotateCcw size={12} /> Reset to try again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Rest Timer & Instructions (1 Column) */}
        <div className="dash-one-col">
          {/* Rest Stopwatch */}
          <div className="dash-card timer-card">
            <span className="dash-card-badge">REST STOPWATCH</span>
            <div className="timer-display">
              <span className="timer-digits">
                {Math.floor(timerSeconds / 60)}:{timerSeconds % 60 < 10 ? "0" : ""}
                {timerSeconds % 60}
              </span>
              <span className="timer-sub">REST INTERVAL BETWEEN SETS</span>
            </div>

            <div className="timer-controls">
              <button
                className="btn btn-primary"
                onClick={() => setTimerRunning(!timerRunning)}
              >
                {timerRunning ? <Pause size={17} /> : <Play size={17} />}
                {timerRunning ? "Pause" : "Start Rest"}
              </button>
              <button className="btn btn-secondary" onClick={() => resetTimer(60)}>
                <RotateCcw size={15} />
                Reset
              </button>
            </div>

            <div className="timer-presets mt-3">
              <button onClick={() => resetTimer(45)}>45s</button>
              <button onClick={() => resetTimer(60)}>60s</button>
              <button onClick={() => resetTimer(90)}>90s</button>
              <button onClick={() => resetTimer(120)}>2m</button>
            </div>
          </div>

          {/* Coach Advice */}
          {coach?.name || user?.trainerName ? (
            <div className="dash-card mt-4 coach-notes-card">
              <div className="flex items-center justify-between mb-3">
                <span className="dash-card-badge">COACH NOTES</span>
                <span className="badge badge-green text-2xs">Assigned Trainer</span>
              </div>
              <div className="coach-note-header mt-1 flex items-center gap-3">
                <div
                  className="coach-avatar font-extrabold flex items-center justify-center text-black"
                  style={{
                    background: "var(--green)",
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    fontSize: "1.1rem",
                    boxShadow: "0 0 16px rgba(183, 255, 60, 0.35)",
                  }}
                >
                  {(coach?.name || user?.trainerName || "C").charAt(0)}
                </div>
                <div>
                  <h5 className="text-white font-bold text-base leading-tight">Coach {coach?.name || user?.trainerName}</h5>
                  <span className="text-cyan text-xs font-medium">
                    {coach?.specialty || user?.trainerSpecialty || "Strength & Hypertrophy"}
                  </span>
                </div>
              </div>
              <p
                className="coach-note-text mt-3 text-xs leading-relaxed"
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  padding: "14px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255, 255, 255, 0.07)",
                  color: "#d1d5db",
                }}
              >
                {user?.coachNotes ||
                  "Follow the prescribed sets and rest periods. Remember to log your weights and stay hydrated. Maintain strict controlled tempo on all compound lifts today."}
              </p>
              <div className="mt-4">
                <Link
                  to="/member/chat"
                  className="btn btn-secondary btn-sm w-full flex items-center justify-center gap-2 text-cyan hover:bg-cyan/10"
                  style={{ borderRadius: "10px" }}
                >
                  <MessageSquare size={14} /> Message Coach {coach?.name || user?.trainerName}
                </Link>
              </div>
            </div>
          ) : (
            <div className="dash-card mt-4 text-center p-5">
              <span className="dash-card-badge">COACH NOTES</span>
              <p className="text-muted text-xs mt-2 mb-3">
                No personal trainer assigned yet. Choose a certified coach from our fitness directory to get custom guidance.
              </p>
              <Link to="/member/coaches" className="btn btn-primary btn-xs mx-auto inline-flex items-center gap-1.5">
                Browse Coaches
              </Link>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
