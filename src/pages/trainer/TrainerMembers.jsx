import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Dumbbell,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  UserCheck,
  UserX,
  Users,
  MessageSquare,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Activity,
  CalendarCheck,
  Calendar,
  Check,
  X,
  Save,
} from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import AttendanceModal from "../../components/AttendanceModal";
import {
  getMembersList,
  getAvailableProMembers,
  assignMemberToTrainer,
  removeMemberFromTrainer,
  getMemberWorkoutStatus,
} from "../../services/mockData";

export default function TrainerMembers() {
  const [activeTab, setActiveTab] = useState("my_athletes"); // "my_athletes" or "available_pro"
  const [search, setSearch] = useState("");
  const [allMembers, setAllMembers] = useState([]);
  const [availableProMembers, setAvailableProMembers] = useState([]);
  const [notification, setNotification] = useState("");

  const [attendanceModalAthlete, setAttendanceModalAthlete] = useState(null);

  const [currentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("fittrack_user") || "{}");
    } catch {
      return {};
    }
  });

  const trainerId = currentUser.id || currentUser._id || currentUser.email || "trainer_default";

  const handleOpenAttendanceModal = (athlete) => {
    setAttendanceModalAthlete(athlete);
  };

  const refreshData = async () => {
    // 1. Local data
    const localAll = getMembersList();
    setAllMembers(localAll);
    setAvailableProMembers(getAvailableProMembers());

    // 2. Fetch from backend API
    try {
      const api = (await import("../../services/api")).default;
      const [membersRes, proRes] = await Promise.allSettled([
        api.get("/members"),
        api.get("/members/available-pro"),
      ]);

      if (membersRes.status === "fulfilled" && membersRes.value.data?.success) {
        setAllMembers(
          membersRes.value.data.members.map((m) => ({
            ...m,
            id: m._id || m.id,
          }))
        );
      }

      if (proRes.status === "fulfilled" && proRes.value.data?.success) {
        setAvailableProMembers(
          proRes.value.data.members.map((m) => ({
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
    window.addEventListener("fittrack:assignment-changed", refreshData);
    window.addEventListener("fittrack:membership-changed", refreshData);
    window.addEventListener("fittrack:workout-changed", refreshData);
    window.addEventListener("fittrack:workout-completed", refreshData);
    window.addEventListener("storage", refreshData);
    return () => {
      window.removeEventListener("fittrack:assignment-changed", refreshData);
      window.removeEventListener("fittrack:membership-changed", refreshData);
      window.removeEventListener("fittrack:workout-changed", refreshData);
      window.removeEventListener("fittrack:workout-completed", refreshData);
      window.removeEventListener("storage", refreshData);
    };
  }, []);

  // Filter My Athletes
  const myAthletes = allMembers.filter((m) => {
    const isMine =
      m.trainerId === trainerId ||
      m.trainerId === currentUser._id ||
      m.trainerId === currentUser.id ||
      (m.trainerId && (m.trainerId._id === trainerId || m.trainerId.id === trainerId)) ||
      m.trainerName === currentUser.name ||
      m.trainer === currentUser.name;
    return isMine;
  });

  const filteredMyAthletes = myAthletes.filter(
    (m) =>
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.goal?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAvailablePro = availableProMembers.filter(
    (m) =>
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.goal?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase())
  );

  // Claim unassigned PRO athlete
  const handleClaimProMember = async (member) => {
    const mId = member.id || member._id;

    try {
      const api = (await import("../../services/api")).default;
      await api.post(`/members/${mId}/assign-trainer`, {
        trainerId: currentUser._id || trainerId,
      });
    } catch {
      // Fallback
    }

    assignMemberToTrainer(mId, currentUser._id || trainerId);
    refreshData();
    setNotification(`✓ Success! ${member.name} has been added to your assigned athletes roster.`);
    setTimeout(() => setNotification(""), 4000);
    setActiveTab("my_athletes");
  };

  // Remove athlete from this trainer's roster
  const handleRemoveFromRoster = async (member) => {
    if (!window.confirm(`Are you sure you want to remove ${member.name} from your roster?`)) return;

    const mId = member.id || member._id;

    try {
      const api = (await import("../../services/api")).default;
      await api.post(`/members/${mId}/remove-trainer`);
    } catch {
      // Fallback
    }

    removeMemberFromTrainer(mId);
    refreshData();
    setNotification(`↺ ${member.name} removed from your roster.`);
    setTimeout(() => setNotification(""), 4000);
  };

  return (
    <DashboardLayout
      title="Athlete Management & Roster"
      subtitle="Track your assigned athletes, prescribe custom splits, and discover available PRO members."
    >
      {notification && (
        <div className="save-toast-pill mb-4">
          <CheckCircle2 size={16} />
          <span>{notification}</span>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex items-center gap-3 border-b mb-4 pb-2" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={() => setActiveTab("my_athletes")}
          className={`flex items-center gap-2 py-2 px-4 rounded-xl font-bold text-sm transition-all ${
            activeTab === "my_athletes"
              ? "bg-primary text-black shadow-lg"
              : "text-muted hover:text-white bg-white/5"
          }`}
        >
          <Users size={16} />
          <span>My Assigned Athletes</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-2xs font-extrabold ${
              activeTab === "my_athletes" ? "bg-black text-white" : "bg-white/10 text-white"
            }`}
          >
            {myAthletes.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("available_pro")}
          className={`flex items-center gap-2 py-2 px-4 rounded-xl font-bold text-sm transition-all ${
            activeTab === "available_pro"
              ? "bg-primary text-black shadow-lg"
              : "text-muted hover:text-white bg-white/5"
          }`}
        >
          <Sparkles size={16} />
          <span>Available PRO Members (Unassigned)</span>
          {availableProMembers.length > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.2 text-2xs font-extrabold ${
                activeTab === "available_pro" ? "bg-black text-white" : "bg-cyan text-black"
              }`}
            >
              {availableProMembers.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: My Assigned Athletes */}
      {activeTab === "my_athletes" && (
        <>
          <div className="table-toolbar">
            <div className="search-input-wrap">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search your athletes by name or goal..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
            </div>
            <span className="text-muted text-xs">
              Roster: <strong>{myAthletes.length}</strong> Athletes Assigned
            </span>
          </div>

          <div className="dash-grid-2 mt-4">
            {filteredMyAthletes.length === 0 ? (
              <div className="dash-card text-center py-14" style={{ gridColumn: "1 / -1" }}>
                <Users size={36} className="mx-auto text-muted mb-3 opacity-40 text-cyan" />
                <h4 className="text-lg font-bold text-white mb-1">No Athletes Assigned to Your Roster</h4>
                <p className="text-muted text-xs max-w-sm mx-auto mb-4">
                  You do not have any athletes assigned yet. You can claim unassigned PRO members immediately under the <strong>Available PRO Members</strong> tab!
                </p>
                <button
                  onClick={() => setActiveTab("available_pro")}
                  className="btn btn-primary btn-sm mx-auto flex items-center gap-1.5"
                >
                  <Sparkles size={15} /> Find Available PRO Members
                </button>
              </div>
            ) : (
              filteredMyAthletes.map((m) => {
                const statusInfo = getMemberWorkoutStatus(m.name || m.email);
                const isCompleted = statusInfo.status === "completed";

                return (
                  <div key={m.id || m.name} className={`dash-card client-card ${isCompleted ? "border-green/40" : ""}`}>
                    <div className="client-header">
                      <div
                        className="client-avatar"
                        style={{
                          background: isCompleted ? "rgba(183, 255, 60, 0.2)" : undefined,
                          color: isCompleted ? "var(--green)" : undefined,
                        }}
                      >
                        {m.name?.charAt(0) || "A"}
                      </div>
                      <div className="client-meta">
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-bold text-white">{m.name}</h4>
                          <span className="badge badge-green text-2xs">{m.plan || "PRO"}</span>
                          {isCompleted && (
                            <span className="badge badge-green text-2xs flex items-center gap-0.5">
                              <CheckCircle2 size={11} /> Done
                            </span>
                          )}
                        </div>
                        <span className="text-muted text-xs block mt-0.5">
                          Goal: <strong className="text-primary">{m.goal || "Fitness"}</strong> • {m.email}
                        </span>
                      </div>

                      <div className="client-score">
                        <span className="client-adherence-val" style={{ color: isCompleted ? "var(--green)" : undefined }}>
                          {statusInfo.progress}%
                        </span>
                        <span className="client-adherence-lbl">ADHERENCE</span>
                      </div>
                    </div>

                    <div className="client-meta-stats mt-3 flex items-center gap-4 text-2xs text-muted">
                      <span>Weight: <strong className="text-white">{m.weight ? `${m.weight} kg` : "70 kg"}</strong></span>
                      <span>Height: <strong className="text-white">{m.height ? `${m.height} cm` : "175 cm"}</strong></span>
                      <span>Status: <strong className="text-green">Active Member</strong></span>
                    </div>

                    {/* Today's Workout Status Strip */}
                    <div className="mt-3 p-2.5 rounded-lg border border-border bg-card/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Dumbbell size={14} className="text-green" />
                        <span>Today: <strong>{statusInfo.workout?.name || "Chest + Triceps Routine"}</strong></span>
                      </div>
                      {isCompleted ? (
                        <span className="badge badge-green flex items-center gap-1 text-2xs font-bold">
                          <CheckCircle2 size={12} /> Finished ({statusInfo.completedAt || "Today"})
                        </span>
                      ) : statusInfo.status === "in-progress" ? (
                        <span className="badge badge-cyan flex items-center gap-1 text-2xs">
                          <Activity size={12} /> In Progress ({statusInfo.completedCount}/{statusInfo.totalCount})
                        </span>
                      ) : (
                        <span className="badge badge-muted flex items-center gap-1 text-2xs">
                          <Clock size={12} /> Awaiting Session
                        </span>
                      )}
                    </div>

                  <div className="client-actions mt-4 flex gap-2 flex-wrap">
                    <Link
                      to={`/trainer/assign-workout?member=${encodeURIComponent(m.name)}`}
                      className="btn btn-primary btn-sm flex-1 flex items-center justify-center gap-1.5"
                    >
                      <Dumbbell size={14} /> Assign Routine
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleOpenAttendanceModal(m)}
                      className="btn btn-secondary btn-sm flex items-center gap-1 text-green"
                      title="Update monthly attendance"
                    >
                      <CalendarCheck size={14} /> Attendance
                    </button>

                    <Link
                      to="/trainer/chat"
                      className="btn btn-secondary btn-sm flex items-center gap-1 text-cyan"
                      title="Open 1-on-1 direct chat"
                    >
                      <MessageSquare size={14} /> Message
                    </Link>

                    <button
                      onClick={() => handleRemoveFromRoster(m)}
                      className="btn btn-secondary btn-sm text-danger hover:text-red-400"
                      title="Remove athlete from your active roster"
                    >
                      <UserX size={14} />
                    </button>
                  </div>
                </div>
              );
            }))}
          </div>
        </>
      )}

      {/* TAB 2: Available PRO Members (Unassigned) */}
      {activeTab === "available_pro" && (
        <>
          <div className="cash-workflow-banner mb-4" style={{ borderColor: "rgba(85, 231, 255, 0.3)", background: "rgba(85, 231, 255, 0.06)" }}>
            <div className="flex items-center gap-3">
              <div className="cash-icon-circle" style={{ background: "rgba(85, 231, 255, 0.15)", color: "#55e7ff" }}>
                <ShieldCheck size={22} />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">PRO Member Acquisition System</h4>
                <p className="text-muted text-xs mt-1">
                  These members hold an active <strong>PRO or Premium</strong> tier and currently have <strong>no trainer assigned</strong>. You can claim and add them directly to your personal training roster.
                </p>
              </div>
            </div>
          </div>

          <div className="table-toolbar">
            <div className="search-input-wrap">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search available PRO athletes by name or goal..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
            </div>
            <span className="text-muted text-xs">
              <strong>{availableProMembers.length}</strong> Available PRO Athletes
            </span>
          </div>

          <div className="dash-grid-2 mt-4">
            {filteredAvailablePro.length === 0 ? (
              <div className="dash-card text-center py-14" style={{ gridColumn: "1 / -1" }}>
                <CheckCircle2 size={36} className="mx-auto text-muted mb-3 opacity-40 text-green" />
                <h4 className="text-lg font-bold text-white mb-1">No Unassigned PRO Members</h4>
                <p className="text-muted text-xs max-w-sm mx-auto">
                  All active PRO athletes have already been assigned to gym coaches. Check back when new members subscribe.
                </p>
              </div>
            ) : (
              filteredAvailablePro.map((m) => (
                <div key={m.id || m.name} className="dash-card client-card">
                  <div className="client-header">
                    <div className="client-avatar">{m.name?.charAt(0) || "A"}</div>
                    <div className="client-meta">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-bold text-white">{m.name}</h4>
                        <span className="badge badge-cyan text-2xs">PRO TIER</span>
                      </div>
                      <span className="text-muted text-xs block mt-0.5">
                        Goal: <strong className="text-primary">{m.goal || "Muscle Gain"}</strong> • {m.email}
                      </span>
                    </div>

                    <div>
                      <span className="badge badge-warning text-3xs">Unassigned</span>
                    </div>
                  </div>

                  <div className="client-meta-stats mt-3 flex items-center gap-4 text-2xs text-muted">
                    <span>Weight: <strong className="text-white">{m.weight ? `${m.weight} kg` : "70 kg"}</strong></span>
                    <span>Height: <strong className="text-white">{m.height ? `${m.height} cm` : "175 cm"}</strong></span>
                    <span>Phone: <strong className="text-white">{m.phone || "—"}</strong></span>
                  </div>

                  <div className="client-actions mt-4">
                    <button
                      onClick={() => handleClaimProMember(m)}
                      className="btn btn-primary btn-sm w-full flex items-center justify-center gap-1.5 font-bold"
                    >
                      <UserCheck size={15} /> Add to My Assigned Roster
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ATHLETE ATTENDANCE MANAGEMENT OVERHAUL MODAL */}
      {attendanceModalAthlete && (
        <AttendanceModal
          athlete={attendanceModalAthlete}
          currentUser={currentUser}
          onClose={() => setAttendanceModalAthlete(null)}
          onSaved={(updated, msg) => {
            setNotification(msg);
            setTimeout(() => setNotification(""), 5000);
            refreshData();
          }}
        />
      )}
    </DashboardLayout>
  );
}
