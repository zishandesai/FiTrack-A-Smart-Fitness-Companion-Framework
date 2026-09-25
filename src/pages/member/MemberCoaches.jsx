import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Dumbbell,
  Star,
  MessageSquare,
  UserCheck,
  UserX,
  ShieldCheck,
  Award,
  Sparkles,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import {
  getTrainersList,
  assignMemberToTrainer,
  removeMemberFromTrainer,
  getMembersList,
} from "../../services/mockData";

export default function MemberCoaches() {
  const [trainers, setTrainers] = useState([]);
  const [search, setSearch] = useState("");
  const [notification, setNotification] = useState("");
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("fittrack_user") || "{}");
    } catch {
      return {};
    }
  });

  const isPro =
    (currentUser.membership === "PRO" ||
      currentUser.membership === "PREMIUM" ||
      currentUser.plan === "PRO" ||
      currentUser.plan === "PREMIUM") &&
    currentUser.membershipStatus === "active";

  const fetchTrainers = async () => {
    setTrainers(getTrainersList());
    try {
      const api = (await import("../../services/api")).default;
      const res = await api.get("/trainers");
      if (res.data?.success && Array.isArray(res.data?.trainers)) {
        setTrainers(
          res.data.trainers.map((t) => ({
            ...t,
            id: t._id || t.id,
          }))
        );
      }
    } catch {
      // Use local list
    }
  };

  const syncCurrentUser = async () => {
    try {
      const api = (await import("../../services/api")).default;
      const res = await api.get("/auth/me");
      if (res.data?.success && res.data?.user) {
        const u = res.data.user;
        setCurrentUser(u);
        localStorage.setItem("fittrack_user", JSON.stringify(u));
        return;
      }
    } catch {
      // Fallback
    }

    const localUser = JSON.parse(localStorage.getItem("fittrack_user") || "{}");
    // Also check members list to get synced trainer
    const members = getMembersList();
    const mem = members.find((m) => m.email === localUser.email || m.name === localUser.name);
    if (mem) {
      localUser.trainerId = mem.trainerId;
      localUser.trainerName = mem.trainerName;
      localUser.trainerSpecialty = mem.trainerSpecialty;
      localStorage.setItem("fittrack_user", JSON.stringify(localUser));
    }
    setCurrentUser(localUser);
  };

  useEffect(() => {
    fetchTrainers();
    syncCurrentUser();

    const handleAssignment = () => {
      fetchTrainers();
      syncCurrentUser();
    };

    window.addEventListener("fittrack:assignment-changed", handleAssignment);
    window.addEventListener("fittrack:membership-changed", handleAssignment);
    return () => {
      window.removeEventListener("fittrack:assignment-changed", handleAssignment);
      window.removeEventListener("fittrack:membership-changed", handleAssignment);
    };
  }, []);

  const handleAssignCoach = async (trainer) => {
    if (!isPro) {
      setNotification("⚠️ Dedicated Coach assignment is exclusively for active PRO members. Please upgrade your plan.");
      setTimeout(() => setNotification(""), 4000);
      return;
    }

    try {
      const api = (await import("../../services/api")).default;
      const memberId = currentUser.id || currentUser._id;
      if (memberId) {
        await api.post(`/members/${memberId}/assign-trainer`, { trainerId: trainer.id || trainer._id });
      }
    } catch {
      // Local fallback
    }

    assignMemberToTrainer(currentUser.id || currentUser.email || currentUser.name, trainer.id || trainer._id);
    await syncCurrentUser();
    setNotification(`✓ Congratulations! Coach ${trainer.name} is now your personal trainer.`);
    setTimeout(() => setNotification(""), 4000);
  };

  const handleCancelCoach = async () => {
    if (!window.confirm("Are you sure you want to cancel your coach assignment? You will be free to pick any other coach at any time.")) {
      return;
    }

    try {
      const api = (await import("../../services/api")).default;
      const memberId = currentUser.id || currentUser._id;
      if (memberId) {
        await api.post(`/members/${memberId}/remove-trainer`);
      }
    } catch {
      // Local fallback
    }

    removeMemberFromTrainer(currentUser.id || currentUser.email || currentUser.name);
    await syncCurrentUser();
    setNotification("↺ Coach assignment has been removed. You can now select another coach.");
    setTimeout(() => setNotification(""), 4000);
  };

  // Find current trainer object
  const currentTrainer = trainers.find(
    (t) =>
      t.id === currentUser.trainerId ||
      t._id === currentUser.trainerId ||
      t.name === currentUser.trainerName
  );

  const filtered = trainers.filter(
    (t) =>
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.specialty?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout
      title="Personal Coaches & Trainers"
      subtitle="Find and select a certified coach for 1-on-1 personalized guidance, tailored workouts, and direct chat."
    >
      {notification && (
        <div className="save-toast-pill mb-4">
          <CheckCircle2 size={16} />
          <span>{notification}</span>
        </div>
      )}

      {/* PRO Membership Banner / Status */}
      {!isPro ? (
        <div className="cash-workflow-banner mb-6" style={{ borderColor: "rgba(255, 170, 0, 0.4)", background: "rgba(255, 170, 0, 0.08)" }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="cash-icon-circle" style={{ background: "rgba(255, 170, 0, 0.18)", color: "#ffaa00" }}>
                <Sparkles size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-base">Personal Coach Access is a PRO Feature</h4>
                  <span className="badge badge-warning text-2xs">PRO ONLY</span>
                </div>
                <p className="text-muted text-xs mt-1 leading-relaxed max-w-xl">
                  Active PRO & Premium members enjoy 1-on-1 personal coaching, customized workout programming, posture feedback, and direct messaging with certified fitness experts.
                </p>
              </div>
            </div>
            <Link to="/member/membership" className="btn btn-primary btn-sm">
              Upgrade to PRO
            </Link>
          </div>
        </div>
      ) : (
        <div className="cash-workflow-banner mb-6" style={{ borderColor: "rgba(85, 231, 255, 0.3)", background: "rgba(85, 231, 255, 0.06)" }}>
          <div className="flex items-center gap-3">
            <div className="cash-icon-circle" style={{ background: "rgba(85, 231, 255, 0.15)", color: "#55e7ff" }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-white text-sm">PRO Membership Active — Coach Selection Unlocked</h4>
                <span className="badge badge-cyan text-2xs">PRO BENEFIT</span>
              </div>
              <p className="text-muted text-xs mt-1">
                You have full access to select your personal trainer, communicate in real time, or change your coach whenever you like.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current Assigned Coach Card (If any) */}
      {(currentTrainer || currentUser.trainerName) && (
        <div className="dash-card mb-6" style={{ border: "1px solid rgba(85, 231, 255, 0.35)", background: "linear-gradient(135deg, rgba(20, 24, 38, 0.95), rgba(16, 20, 32, 0.95))" }}>
          <div className="flex items-center justify-between flex-wrap gap-4 mb-3">
            <div className="flex items-center gap-2">
              <span className="badge badge-cyan text-2xs">YOUR DEDICATED COACH</span>
              <span className="text-muted text-xs">• 1-on-1 Direct Support</span>
            </div>
            <button
              onClick={handleCancelCoach}
              className="btn btn-danger btn-xs flex items-center gap-1"
              title="Cancel your current coach if you are not satisfied"
            >
              <UserX size={14} />
              Cancel / Unassign Coach
            </button>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="trainer-avatar-large" style={{ width: "64px", height: "64px", fontSize: "1.5rem" }}>
              {(currentTrainer?.name || currentUser.trainerName || "C").charAt(0)}
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white">
                  {currentTrainer?.name || currentUser.trainerName}
                </h3>
                <span className="badge badge-green text-2xs">Active</span>
              </div>
              <p className="text-cyan text-xs font-semibold mt-1">
                {currentTrainer?.specialty || currentUser.trainerSpecialty || "Strength & Conditioning"}
              </p>
              <div className="flex items-center gap-4 text-muted text-xs mt-2 flex-wrap">
                <span className="flex items-center gap-1">
                  <Mail size={12} /> {currentTrainer?.email || "coach@fittrack.com"}
                </span>
                {currentTrainer?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={12} /> {currentTrainer.phone}
                  </span>
                )}
                <span className="flex items-center gap-1 text-yellow">
                  <Star size={12} fill="currentColor" /> 5.0 Rating
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/member/chat" className="btn btn-primary btn-sm flex items-center gap-2">
                <MessageSquare size={16} />
                Message Coach
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Search & Trainer Directory */}
      <div className="table-toolbar">
        <div className="search-input-wrap">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search coaches by name, specialization..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
        <span className="text-muted text-xs">
          {trainers.length} Certified Trainers Available
        </span>
      </div>

      <div className="dash-grid-2 mt-4">
        {filtered.length === 0 ? (
          <div className="dash-card text-center py-12" style={{ gridColumn: "1 / -1" }}>
            <p className="text-muted text-base mb-2">No coaches found matching "{search}".</p>
            <p className="text-muted text-xs">Try searching for different keywords or check back soon.</p>
          </div>
        ) : (
          filtered.map((t) => {
            const isAssignedToThis =
              currentUser.trainerId === t.id ||
              currentUser.trainerId === t._id ||
              currentUser.trainerName === t.name;

            return (
              <div
                key={t.id || t._id}
                className="dash-card trainer-card"
                style={{
                  borderColor: isAssignedToThis ? "rgba(85, 231, 255, 0.4)" : undefined,
                }}
              >
                <div className="trainer-card-top">
                  <div className="trainer-avatar-large">{t.name.charAt(0)}</div>
                  <div className="trainer-info">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-lg">{t.name}</h4>
                      {isAssignedToThis ? (
                        <span className="badge badge-cyan text-2xs">Your Coach</span>
                      ) : (
                        <span className="badge badge-green text-2xs">Available</span>
                      )}
                    </div>
                    <p className="text-muted text-xs mt-1">{t.specialty}</p>
                    <div className="trainer-rating-row mt-2">
                      <Star size={14} className="star-icon" fill="currentColor" />
                      <span className="rating-val">{t.rating || 5.0}</span>
                      <span className="text-muted text-xs">• {t.experience || "3+ yrs"}</span>
                    </div>
                  </div>
                </div>

                <div className="trainer-meta-strip mt-3">
                  <div className="t-meta-item">
                    <Mail size={13} />
                    <span>{t.email}</span>
                  </div>
                  {t.phone && (
                    <div className="t-meta-item">
                      <Phone size={13} />
                      <span>{t.phone}</span>
                    </div>
                  )}
                </div>

                <div className="client-actions mt-4 flex gap-2">
                  {isAssignedToThis ? (
                    <>
                      <Link to="/member/chat" className="btn btn-primary btn-sm flex-1 flex items-center justify-center gap-1">
                        <MessageSquare size={14} /> Message Coach
                      </Link>
                      <button
                        onClick={handleCancelCoach}
                        className="btn btn-secondary btn-sm text-danger"
                        title="Cancel coach assignment"
                      >
                        <UserX size={14} /> Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleAssignCoach(t)}
                      disabled={!isPro}
                      className="btn btn-primary btn-sm flex-1 flex items-center justify-center gap-1"
                      title={!isPro ? "Upgrade to PRO to assign coach" : "Assign this coach to you"}
                    >
                      <UserCheck size={14} />
                      {currentUser.trainerId ? "Switch to this Coach" : "Assign as My Coach"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
}
