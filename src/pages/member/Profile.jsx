import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Calendar,
  CalendarCheck,
  Save,
  CheckCircle2,
  Lock,
  LogOut,
  User,
  ShieldCheck,
  Check,
  Banknote,
  Dumbbell,
  MessageSquare,
  UserCheck,
  Clock,
  Flame,
  Award,
} from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import {
  getMemberships,
  requestMembership,
  getAttendanceData,
  saveAttendanceData,
  getMembersList,
  saveMembersList,
  getTrainersList,
  getMemberAttendanceRecord,
  calculateDaysRemaining,
} from "../../services/mockData";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const userName = user?.name || "Member";

  const [saved, setSaved] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("PRO");

  const [membership, setMembership] = useState(() => {
    const memberships = getMemberships();
    return memberships.find(
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

  const [attendanceRecord, setAttendanceRecord] = useState(() => {
    return getMemberAttendanceRecord(user?.email || user?.name || userName);
  });

  const [attendanceList, setAttendanceList] = useState(() => {
    const rec = getMemberAttendanceRecord(user?.email || user?.name || userName);
    return rec?.history || [];
  });

  const [assignedCoach, setAssignedCoach] = useState(() => {
    const coachName = user?.trainerName || user?.trainer || null;
    return coachName
      ? {
          name: coachName,
          specialty: user?.trainerSpecialty || "Strength & Conditioning Specialist",
          phone: user?.trainerPhone || null,
          id: user?.trainerId || null,
        }
      : null;
  });

  const [form, setForm] = useState({
    name: userName,
    email: user?.email || "",
    phone: user?.phone || "",
    age: user?.age || "",
    height: user?.height || "",
    weight: user?.weight || "",
    goal: user?.goal || "General Fitness",
  });

  useEffect(() => {
    const syncMembership = () => {
      const memberships = getMemberships();
      const myMem = memberships.find(
        (m) =>
          m.memberName?.toLowerCase() === userName.toLowerCase() ||
          m.memberEmail === user?.email
      );
      if (myMem) setMembership(myMem);
    };
    syncMembership();

    const syncAttendance = () => {
      const rec = getMemberAttendanceRecord(user?.email || user?.name || userName);
      setAttendanceRecord(rec);
      setAttendanceList(rec?.history || []);
    };
    syncAttendance();

    const resolveCoach = async () => {
      const localUser = JSON.parse(localStorage.getItem("fittrack_user") || "{}");
      let coachName = user?.trainerName || user?.trainer || localUser?.trainerName || localUser?.trainer || null;
      let coachSpecialty = user?.trainerSpecialty || localUser?.trainerSpecialty || "Strength & Conditioning Specialist";
      let coachPhone = user?.trainerPhone || localUser?.trainerPhone || null;
      let coachId = user?.trainerId || localUser?.trainerId || null;

      // 1. Cross-check members list
      const members = getMembersList();
      const currentMem = members.find(
        (m) =>
          (user?.email && m.email?.toLowerCase() === user.email.toLowerCase()) ||
          (user?.name && m.name?.toLowerCase() === user.name.toLowerCase()) ||
          (userName && m.name?.toLowerCase() === userName.toLowerCase()) ||
          (localUser?.email && m.email?.toLowerCase() === localUser.email.toLowerCase())
      );

      if (currentMem?.trainerName) {
        coachName = currentMem.trainerName;
        if (currentMem.trainerSpecialty) coachSpecialty = currentMem.trainerSpecialty;
        if (currentMem.trainerId) coachId = currentMem.trainerId;
      } else if (currentMem?.trainerId) {
        coachId = currentMem.trainerId;
      }

      // 2. Cross-check trainers list
      const trainers = getTrainersList();
      if (coachId) {
        const found = trainers.find((t) => t.id === coachId || t._id === coachId);
        if (found) {
          coachName = found.name;
          coachSpecialty = found.specialty || coachSpecialty;
          coachPhone = found.phone || coachPhone;
        }
      } else if (coachName) {
        const found = trainers.find((t) => t.name?.toLowerCase() === coachName.toLowerCase());
        if (found) {
          coachSpecialty = found.specialty || coachSpecialty;
          coachPhone = found.phone || coachPhone;
          coachId = found.id || found._id;
        }
      }

      // 3. Fallback to API if available
      try {
        const api = (await import("../../services/api")).default;
        const res = await api.get("/chat/contacts");
        if (res.data?.success && res.data?.contacts?.length > 0) {
          const contact = res.data.contacts[0];
          coachName = contact.name;
          coachSpecialty = contact.specialty || coachSpecialty;
          coachId = contact._id || coachId;
        }
      } catch {
        // Backend offline or local fallback
      }

      if (coachName) {
        setAssignedCoach({
          name: coachName,
          specialty: coachSpecialty,
          phone: coachPhone,
          id: coachId,
        });
      } else {
        setAssignedCoach(null);
      }
    };

    resolveCoach();

    window.addEventListener("fittrack:assignment-changed", resolveCoach);
    window.addEventListener("fittrack:membership-changed", syncMembership);
    window.addEventListener("fittrack:attendance-changed", syncAttendance);
    window.addEventListener("storage", resolveCoach);

    return () => {
      window.removeEventListener("fittrack:assignment-changed", resolveCoach);
      window.removeEventListener("fittrack:membership-changed", syncMembership);
      window.removeEventListener("fittrack:attendance-changed", syncAttendance);
      window.removeEventListener("storage", resolveCoach);
    };
  }, [userName, user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setSaved(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const savedUser = JSON.parse(localStorage.getItem("fittrack_user") || "{}");
      const updatedUser = {
        ...savedUser,
        name: form.name,
        email: form.email,
        phone: form.phone,
        age: form.age,
        height: form.height,
        weight: form.weight,
        goal: form.goal,
      };
      localStorage.setItem("fittrack_user", JSON.stringify(updatedUser));

      const members = getMembersList();
      const idx = members.findIndex(
        (m) => m.email === form.email || m.name?.toLowerCase() === userName.toLowerCase()
      );
      if (idx !== -1) {
        members[idx] = { ...members[idx], ...form };
        saveMembersList(members);
      }

      try {
        const api = (await import("../../services/api")).default;
        await api.put("/members/profile", form);
      } catch {
        // Local fallback
      }
    } catch {
      // ignore
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setPasswordSuccess(true);
    setTimeout(() => {
      setPasswordSuccess(false);
      setShowPasswordModal(false);
    }, 2000);
  };

  const handlePlanRequest = (plan) => {
    const updated = requestMembership(userName, form.email, plan);
    setMembership(updated);
    setShowPlanModal(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Dynamic Date and Time Information
  const now = new Date();
  const todayDay = now.getDate();
  const currentMonthName = now.toLocaleString("en-US", { month: "long" });
  const currentYear = now.getFullYear();
  const todayFormatted = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const daysInMonth = Math.max(
    30,
    new Date(currentYear, now.getMonth() + 1, 0).getDate()
  );

  // Member Lifecycle Information (When he joined / when he left or expires)
  const rawJoined =
    user?.createdAt ||
    user?.startDate ||
    membership?.startDate ||
    membership?.requestedAt;
  let joinedDate = "15 Aug 2025";
  if (rawJoined) {
    const d = new Date(rawJoined);
    if (!isNaN(d.getTime())) {
      joinedDate = d.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } else {
      joinedDate = String(rawJoined);
    }
  }

  const isLeftOrExpired =
    membership?.status === "expired" ||
    membership?.status === "inactive" ||
    membership?.status === "left" ||
    membership?.status === "cancelled";
  const rawExpiry = membership?.endDate || user?.membershipExpiry || "20 March 2027";
  const daysRemaining = calculateDaysRemaining(rawExpiry);

  // Attendance metrics
  const presentCount = attendanceList.filter((a) => a.present).length;
  const recordedDays = Math.max(
    todayDay,
    attendanceList.filter((a, idx) => idx + 1 <= todayDay || a.present).length
  );
  const attendanceRate = Math.min(
    100,
    Math.round((presentCount / Math.max(1, recordedDays)) * 100)
  );

  return (
    <DashboardLayout
      title="Member Profile"
      subtitle="Manage your bio-metrics, membership tier, coach assignment, and attendance history."
    >
      <div className="dash-grid-3">
        {/* Left Column: Summary Card, Membership Card & Attendance */}
        <div className="dash-one-col">
          {/* User Card */}
          <div className="dash-card text-center">
            <div className="profile-avatar-large">
              {form.name ? form.name.charAt(0).toUpperCase() : "A"}
            </div>
            <h3 className="mt-3">{form.name}</h3>
            <p className="text-muted text-xs">{form.email}</p>
            <div className="mt-2 flex items-center justify-center gap-1.5 flex-wrap">
              <span className="badge badge-green">GOAL: {form.goal}</span>
              <span className="badge badge-cyan">{isLeftOrExpired ? "LEFT / EXPIRED" : "ACTIVE MEMBER"}</span>
            </div>

            <div className="profile-quick-stats mt-4">
              <div>
                <span className="p-stat-val">{form.weight} kg</span>
                <span className="p-stat-lbl">WEIGHT</span>
              </div>
              <div>
                <span className="p-stat-val">{form.height} cm</span>
                <span className="p-stat-lbl">HEIGHT</span>
              </div>
              <div>
                <span className="p-stat-val">{form.age} yrs</span>
                <span className="p-stat-lbl">AGE</span>
              </div>
            </div>

            {/* Member Lifecycle Quick Info */}
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-2xs text-muted">
              <span className="flex items-center gap-1">
                <Clock size={12} className="text-green" /> Joined: <strong className="text-white">{joinedDate}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Award size={12} className={isLeftOrExpired ? "text-danger" : "text-cyan"} />
                {isLeftOrExpired ? "Left:" : "Expires:"} <strong className="text-white">{rawExpiry}</strong>
                {!isLeftOrExpired && daysRemaining !== null && (
                  <span className={`ml-1 text-2xs font-semibold ${daysRemaining <= 0 ? "text-danger" : "text-green"}`}>
                    ({daysRemaining > 0 ? `${daysRemaining}d left` : daysRemaining === 0 ? "today" : "expired"})
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Membership Tier & Status */}
          <div className="dash-card mt-4 membership-badge-card">
            <div className="membership-top">
              <span className="dash-card-badge">MEMBERSHIP PLAN</span>
              <span
                className={`badge ${
                  membership?.status === "active" ? "badge-green" : "badge-warning"
                }`}
              >
                {membership?.status === "active" ? "✓ ACTIVE" : "⏳ PENDING APPROVAL"}
              </span>
            </div>

            <h4 className="mt-2 text-lg font-bold">{membership?.plan || "PRO"} TIER</h4>

            <div className="text-xs text-muted mt-2 space-y-1">
              <div className="flex items-center gap-1">
                <Banknote size={13} className="text-green" />
                <span>Payment: <strong>Cash at Gym Desk</strong></span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={13} className="text-cyan" />
                <span>Member Since: <strong>{joinedDate}</strong></span>
              </div>
            </div>

            <div className="membership-renew-date mt-2">
              <Calendar size={13} />
              <span>
                {isLeftOrExpired ? "Left Gym:" : "Expires:"} <strong>{rawExpiry}</strong>
                {!isLeftOrExpired && daysRemaining !== null && (
                  <span className={`ml-1 font-semibold ${daysRemaining <= 0 ? "text-danger" : "text-green"}`}>
                    ({daysRemaining > 0 ? `${daysRemaining} Days Left` : daysRemaining === 0 ? "Expires Today" : "Expired"})
                  </span>
                )}
              </span>
            </div>

            <button
              className="btn btn-secondary btn-sm full-width mt-3"
              onClick={() => setShowPlanModal(true)}
            >
              Change or Request Plan
            </button>
          </div>

          {/* Trainer Assignment */}
          <div className="dash-card mt-4 coach-profile-card">
            <div className="flex justify-between items-center mb-3">
              <span className="dash-card-badge">ASSIGNED TRAINER</span>
              {assignedCoach ? (
                <span className="badge badge-green flex items-center gap-1">
                  <Check size={12} /> ACTIVE COACH
                </span>
              ) : (
                <span className="badge badge-warning">NO COACH</span>
              )}
            </div>

            {assignedCoach ? (
              <div className="assigned-coach-content">
                <div className="flex items-center gap-3">
                  <div className="coach-avatar-active">
                    {assignedCoach.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-white">
                      Coach {assignedCoach.name}
                    </h4>
                    <p className="text-muted text-xs mt-0.5">
                      {assignedCoach.specialty || "Strength & Hypertrophy Specialist"}
                    </p>
                    <span className="coach-live-indicator">
                      <span className="pulse-dot"></span> Online & Guiding Your Plan
                    </span>
                  </div>
                </div>

                <div className="coach-actions-grid mt-4">
                  <Link
                    to="/member/chat"
                    className="btn btn-primary btn-sm flex items-center justify-center gap-1"
                  >
                    <MessageSquare size={14} /> Message Coach
                  </Link>
                  <Link
                    to="/member/workout"
                    className="btn btn-secondary btn-sm flex items-center justify-center gap-1"
                  >
                    <Dumbbell size={14} /> View Workout
                  </Link>
                </div>
              </div>
            ) : (
              <div className="unassigned-coach-content">
                <div className="flex items-center gap-3">
                  <div className="coach-avatar">—</div>
                  <div>
                    <h4>No Coach Assigned</h4>
                    <p className="text-muted text-xs">
                      PRO members can choose a dedicated coach or contact gym desk.
                    </p>
                  </div>
                </div>
                <Link
                  to="/member/coaches"
                  className="btn btn-secondary btn-sm full-width mt-3 flex items-center justify-center gap-1"
                >
                  <UserCheck size={14} /> Browse Certified Coaches
                </Link>
              </div>
            )}
          </div>

          {/* Monthly Attendance Card (All 30 Days with Dynamic Date/Month) */}
          <div className="dash-card mt-4 attendance-card-enhanced">
            <div className="flex justify-between items-start">
              <div>
                <span className="dash-card-badge">MONTHLY ATTENDANCE</span>
                <span className="block text-xs font-bold text-white mt-1">
                  {currentMonthName} {currentYear} Register ({daysInMonth} Days)
                </span>
                <span className="block text-2xs text-muted mt-0.5 flex items-center gap-1">
                  <CalendarCheck size={11} className="text-green" /> Today: {todayFormatted} (Day {todayDay})
                </span>
              </div>
              <div className="text-right">
                <span className="badge badge-green font-extrabold text-xs block">
                  {attendanceRate}% PRESENT
                </span>
                <span className="text-2xs text-muted mt-0.5 block">
                  {presentCount} / {recordedDays} Recorded Days
                </span>
              </div>
            </div>

            {/* 30-Day Grid */}
            <div className="attendance-grid-mini-30 mt-3">
              {attendanceList.length === 0 ? (
                <p className="text-muted text-xs py-4 text-center">No attendance recorded this month yet.</p>
              ) : (
                attendanceList.map((item) => {
                  const isToday = item.day === todayDay;
                  return (
                    <div
                      key={item.day}
                      className={`att-day-badge ${item.present ? "present" : "absent"} ${
                        isToday ? "is-today" : ""
                      }`}
                      title={`Day ${item.day}: ${
                        item.present ? "Present (Verified by Coach)" : "Absent / Rest Day"
                      }${isToday ? " [TODAY]" : ""}`}
                    >
                      {item.present ? "✓" : "✗"} {item.day}
                    </div>
                  );
                })
              )}
            </div>

            {/* Trainer Verification & Timestamp */}
            <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-2xs">
              <span className="flex items-center gap-1.5 text-green font-medium">
                <ShieldCheck size={13} />
                <span>
                  Updated by: <strong>{attendanceRecord?.updatedBy || (assignedCoach ? `Coach ${assignedCoach.name}` : "Coach Zishan Desai")}</strong>
                </span>
              </span>
              <span className="text-muted">
                {attendanceRecord?.updatedAt || `Active ${currentMonthName} Cycle`}
              </span>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Edit Form & Action Buttons */}
        <div className="dash-two-cols">
          <div className="dash-card">
            <div className="dash-card-header">
              <div>
                <span className="dash-card-badge">EDIT PROFILE</span>
                <h3 className="dash-card-title">Personal & Fitness Details</h3>
              </div>
              {saved && (
                <div className="save-toast-pill">
                  <CheckCircle2 size={15} />
                  <span>Profile updated successfully!</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSave} className="profile-form mt-4">
              <div className="signup-grid">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Age</label>
                  <input
                    type="number"
                    name="age"
                    value={form.age}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Height (cm)</label>
                  <input
                    type="number"
                    name="height"
                    value={form.height}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Current Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    name="weight"
                    value={form.weight}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Fitness Goal</label>
                  <select
                    name="goal"
                    value={form.goal}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="Muscle Gain">Muscle Gain</option>
                    <option value="Weight Loss">Weight Loss</option>
                    <option value="Strength">Strength</option>
                    <option value="General Fitness">General Fitness</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex justify-between items-center flex-wrap gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowPasswordModal(true)}
                  >
                    <Lock size={15} /> Change Password
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary text-danger"
                    onClick={handleLogout}
                  >
                    <LogOut size={15} /> Logout
                  </button>
                </div>

                <button type="submit" className="btn btn-primary">
                  <Save size={16} /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Change Password</h3>
              <button className="modal-close-btn" onClick={() => setShowPasswordModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handlePasswordSubmit} className="mt-4">
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input type="password" required className="form-input" placeholder="••••••••" />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input type="password" required className="form-input" placeholder="••••••••" />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input type="password" required className="form-input" placeholder="••••••••" />
              </div>

              {passwordSuccess && (
                <div className="save-toast-pill mb-3">
                  <CheckCircle2 size={15} />
                  <span>Password changed successfully!</span>
                </div>
              )}

              <div className="modal-footer mt-4">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plan Selection Modal */}
      {showPlanModal && (
        <div className="modal-overlay" onClick={() => setShowPlanModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Select Membership Plan</h3>
              <button className="modal-close-btn" onClick={() => setShowPlanModal(false)}>
                ✕
              </button>
            </div>
            <div className="plan-selection-grid mt-4">
              {[
                { name: "BASIC", price: "₹999", desc: "Access to free weights, cardio floor" },
                { name: "PRO", price: "₹1,999", desc: "All-Access + AI Form Coach + Locker" },
                { name: "PREMIUM", price: "₹2,999", desc: "1-on-1 Personal Trainer + AI Coach + Diet" },
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
                  <p className="text-muted text-xs mt-1">{p.desc}</p>
                  <div className="payment-notice mt-2">
                    <Banknote size={13} className="inline mr-1 text-green" />
                    Payment: <strong>Cash at Gym Front Desk</strong>
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-footer mt-4">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowPlanModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handlePlanRequest(selectedPlan)}
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
