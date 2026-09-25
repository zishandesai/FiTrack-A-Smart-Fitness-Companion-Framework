import React, { useState, useEffect } from "react";
import {
  CalendarCheck,
  Calendar,
  Check,
  X,
  Save,
  Clock,
  User,
  Phone,
  Mail,
  Target,
  Activity,
  ShieldCheck,
  Award,
  Flame,
  Info,
  CreditCard,
  UserCheck,
} from "lucide-react";
import {
  getMemberAttendanceRecord,
  updateAthleteAttendanceByTrainer,
  getMembersList,
  getMemberships,
  calculateDaysRemaining,
} from "../services/mockData";

export default function AttendanceModal({
  athlete,
  currentUser,
  onClose,
  onSaved,
}) {
  if (!athlete) return null;

  // Dynamic Date and Time Information
  const now = new Date();
  const todayDay = now.getDate();
  const currentMonthName = now.toLocaleString("en-US", { month: "long" });
  const currentMonthShort = now.toLocaleString("en-US", { month: "short" });
  const currentYear = now.getFullYear();
  const daysInMonth = Math.max(
    30,
    new Date(currentYear, now.getMonth() + 1, 0).getDate()
  );

  const todayFormatted = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Resolve athlete's comprehensive profile data
  const athleteKey = (athlete.email || athlete.name || athlete.id || "")
    .toLowerCase()
    .trim();
  const members = getMembersList();
  const memberships = getMemberships();

  const matchedMember =
    members.find(
      (m) =>
        (m.email && m.email.toLowerCase() === athleteKey) ||
        (m.name && m.name.toLowerCase() === athleteKey) ||
        m.id === athlete.id ||
        m._id === athlete.id
    ) || {};

  const matchedMembership =
    memberships.find(
      (m) =>
        (m.memberEmail && m.memberEmail.toLowerCase() === athleteKey) ||
        (m.memberName && m.memberName.toLowerCase() === athleteKey)
    ) || {};

  let localUser = {};
  try {
    const parsed = JSON.parse(localStorage.getItem("fittrack_user") || "{}");
    if (
      (parsed.email && parsed.email.toLowerCase() === athleteKey) ||
      (parsed.name && parsed.name.toLowerCase() === athleteKey)
    ) {
      localUser = parsed;
    }
  } catch {
    // ignore
  }

  // Member Identity & Lifecycle Details
  const memberName = athlete.name || matchedMember.name || localUser.name || "Member";
  const memberEmail = athlete.email || matchedMember.email || localUser.email || "member@fittrack.com";
  const memberPhone = athlete.phone || matchedMember.phone || localUser.phone || "+91 98765 43210";

  // When he joined
  const rawJoined =
    athlete.createdAt ||
    matchedMember.createdAt ||
    localUser.createdAt ||
    matchedMembership.startDate ||
    matchedMembership.requestedAt;
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

  // When he left or expiration / status
  const membershipStatus =
    athlete.membershipStatus ||
    matchedMember.membershipStatus ||
    localUser.membershipStatus ||
    matchedMembership.status ||
    "active";

  const rawExpiry =
    athlete.endDate ||
    matchedMember.endDate ||
    localUser.membershipExpiry ||
    matchedMembership.endDate ||
    "20 March 2027";
  const daysRemaining = calculateDaysRemaining(rawExpiry);

  const isLeftOrExpired =
    membershipStatus === "expired" ||
    membershipStatus === "inactive" ||
    membershipStatus === "left" ||
    membershipStatus === "cancelled";

  const planTier = (
    athlete.plan ||
    matchedMember.plan ||
    localUser.membership ||
    matchedMembership.plan ||
    "PRO"
  ).toUpperCase();

  // Biometrics & Fitness Details
  const age = athlete.age || matchedMember.age || localUser.age || 21;
  const height = athlete.height || matchedMember.height || localUser.height || 175;
  const weight = athlete.weight || matchedMember.weight || localUser.weight || 70;
  const goal = athlete.goal || matchedMember.goal || localUser.goal || "Muscle Gain";

  const heightInMeters = (Number(height) || 175) / 100;
  const bmiNumber = (
    (Number(weight) || 70) /
    (heightInMeters * heightInMeters)
  ).toFixed(1);
  let bmiCategory = "Normal";
  if (bmiNumber < 18.5) bmiCategory = "Underweight";
  else if (bmiNumber >= 25 && bmiNumber < 30) bmiCategory = "Overweight";
  else if (bmiNumber >= 30) bmiCategory = "Obese";

  // Coach Information
  const trainerRaw =
    athlete.trainerName ||
    matchedMember.trainerName ||
    currentUser?.name ||
    "Coach Zishan Desai";
  const assignedCoach = trainerRaw.startsWith("Coach")
    ? trainerRaw
    : `Coach ${trainerRaw}`;

  // Attendance History State (All 30 Days)
  const [history, setHistory] = useState(() => {
    const rec = getMemberAttendanceRecord(athleteKey);
    const existingHistory = rec.history || [];

    // Ensure all 30 days are present
    const map = new Map();
    existingHistory.forEach((item) => {
      map.set(item.day, !!item.present);
    });

    const full = [];
    for (let d = 1; d <= daysInMonth; d++) {
      if (map.has(d)) {
        full.push({ day: d, present: map.get(d) });
      } else {
        const isPastOrToday = d <= todayDay;
        const isRest = d === 4 || d === 7 || d === 10;
        full.push({ day: d, present: isPastOrToday && !isRest });
      }
    }
    return full;
  });

  const [saving, setSaving] = useState(false);

  // Computed Metrics
  const presentCount = history.filter((h) => h.present).length;
  const absentCount = history.filter((h) => !h.present && h.day <= todayDay).length;
  const recordedDays = Math.max(
    todayDay,
    history.filter((h, idx) => idx + 1 <= todayDay || h.present).length
  );
  const attendanceRate = Math.min(
    100,
    Math.round((presentCount / Math.max(1, recordedDays)) * 100)
  );

  // Today's Status
  const todayItem = history.find((h) => h.day === todayDay);
  const isTodayPresent = todayItem ? todayItem.present : false;

  // Streak calculation
  const calculateStreak = () => {
    let streak = 0;
    for (let d = todayDay; d >= 1; d--) {
      const item = history.find((h) => h.day === d);
      if (item && item.present) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };
  const currentStreak = calculateStreak();

  // Handlers
  const handleToggleDay = (dayNum) => {
    setHistory((prev) =>
      prev.map((item) =>
        item.day === dayNum ? { ...item, present: !item.present } : item
      )
    );
  };

  const handleSetToday = (isPresent) => {
    setHistory((prev) =>
      prev.map((item) =>
        item.day === todayDay ? { ...item, present: isPresent } : item
      )
    );
  };

  const handleMarkAllPast = (isPresent) => {
    setHistory((prev) =>
      prev.map((item) =>
        item.day <= todayDay ? { ...item, present: isPresent } : item
      )
    );
  };

  const handleSave = () => {
    setSaving(true);
    try {
      const updated = updateAthleteAttendanceByTrainer(
        athleteKey,
        history,
        currentUser?.name || "Trainer"
      );
      if (onSaved) {
        onSaved(
          updated,
          `✓ Attendance updated for ${memberName}: ${updated.attendanceRate}% Present (${presentCount}/${history.length} Days in ${currentMonthName}).`
        );
      }
      onClose();
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box attendance-overhaul-modal"
        style={{ maxWidth: 660, maxHeight: "92vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div
              className="client-avatar"
              style={{
                width: 44,
                height: 44,
                fontSize: 18,
                background: "rgba(183, 255, 60, 0.2)",
                color: "var(--green)",
                border: "1.5px solid rgba(183, 255, 60, 0.4)",
              }}
            >
              {memberName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-lg leading-tight">
                  Manage Attendance — {memberName}
                </h3>
                <span
                  className={`badge text-2xs ${
                    isLeftOrExpired ? "badge-danger" : "badge-green"
                  }`}
                >
                  {isLeftOrExpired ? "LEFT / EXPIRED" : "ACTIVE MEMBER"}
                </span>
              </div>
              <span className="text-muted text-xs mt-0.5 block">
                Plan: <strong className="text-white">{planTier} TIER</strong> •
                Goal: <strong className="text-white">{goal}</strong> • {memberEmail}
              </span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close modal">
            ✕
          </button>
        </div>

        <div className="modal-body mt-4 space-y-4">
          {/* Dynamic Automatic Date & Month Live Banner */}
          <div className="dynamic-date-banner p-3 rounded-xl bg-card border border-border flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-green/15 text-green">
                <Calendar size={18} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xs text-muted uppercase font-bold tracking-wider">
                    Today's Date & Active Cycle
                  </span>
                  <span className="pulse-dot" title="Live Auto Synced"></span>
                </div>
                <h4 className="text-sm font-extrabold text-white">
                  {todayFormatted}
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-2 text-right">
              <span className="badge badge-cyan text-xs font-bold px-2.5 py-1">
                {currentMonthName} {currentYear} • {daysInMonth} Days
              </span>
              <span className="badge badge-green text-xs font-bold px-2.5 py-1">
                Day {todayDay} of {daysInMonth}
              </span>
            </div>
          </div>

          {/* Comprehensive Member Dossier: Joined, Left, Plan, Contact, Biometrics */}
          <div className="member-dossier-card p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-green flex items-center gap-1.5">
                <ShieldCheck size={14} /> Member Profile & Lifecycle Record
              </span>
              <span className="text-2xs text-muted">
                Coach: <strong className="text-white">{assignedCoach}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              {/* Joined Date */}
              <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-muted text-2xs block uppercase font-semibold">
                  Member Since (Joined)
                </span>
                <span className="font-bold text-white mt-0.5 block flex items-center gap-1">
                  <Clock size={12} className="text-green" /> {joinedDate}
                </span>
              </div>

              {/* Left / Validity Date */}
              <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-muted text-2xs block uppercase font-semibold">
                  {isLeftOrExpired ? "Left Gym On" : "Membership Valid Till"}
                </span>
                <span
                  className={`font-bold mt-0.5 block flex items-center gap-1 ${
                    isLeftOrExpired ? "text-danger" : "text-white"
                  }`}
                >
                  <Award size={12} className={isLeftOrExpired ? "text-danger" : "text-cyan"} />
                  {rawExpiry}
                  {!isLeftOrExpired && daysRemaining !== null && (
                    <span className={`text-2xs font-semibold ml-1 ${daysRemaining <= 0 ? "text-danger" : "text-green"}`}>
                      ({daysRemaining > 0 ? `${daysRemaining}d left` : daysRemaining === 0 ? "today" : "expired"})
                    </span>
                  )}
                </span>
              </div>

              {/* Plan & Tier */}
              <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-muted text-2xs block uppercase font-semibold">
                  Subscription Tier
                </span>
                <span className="font-bold text-white mt-0.5 block flex items-center gap-1">
                  <CreditCard size={12} className="text-amber-400" />
                  {planTier} (₹{planTier === "BASIC" ? "999" : planTier === "PREMIUM" ? "2,999" : "1,999"}/mo)
                </span>
              </div>

              {/* Phone / Contact */}
              <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                <span className="text-muted text-2xs block uppercase font-semibold">
                  Contact Phone
                </span>
                <span className="font-bold text-white mt-0.5 block flex items-center gap-1 truncate">
                  <Phone size={12} className="text-green" />
                  {memberPhone}
                </span>
              </div>
            </div>

            {/* Physical Biometrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2.5 text-xs pt-2 border-t border-white/5">
              <div>
                <span className="text-2xs text-muted block">Age & Gender</span>
                <span className="font-bold text-white">{age} yrs • Male</span>
              </div>
              <div>
                <span className="text-2xs text-muted block">Height & Weight</span>
                <span className="font-bold text-white">
                  {height} cm • {weight} kg
                </span>
              </div>
              <div>
                <span className="text-2xs text-muted block">Body Mass Index (BMI)</span>
                <span className="font-bold text-cyan">
                  {bmiNumber} ({bmiCategory})
                </span>
              </div>
              <div>
                <span className="text-2xs text-muted block">Fitness Objective</span>
                <span className="font-bold text-white flex items-center gap-1">
                  <Target size={12} className="text-green" /> {goal}
                </span>
              </div>
            </div>
          </div>

          {/* Month Stats Summary Bar */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
            <div>
              <span className="text-2xs text-muted font-bold uppercase tracking-wider block">
                {currentMonthName} Attendance Performance
              </span>
              <span className="text-sm font-bold text-white mt-0.5 block">
                {presentCount} Present / {recordedDays} Recorded Days • {daysInMonth} Days Total
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-2xs text-muted block">Active Streak</span>
                <span className="text-xs font-extrabold text-amber-400 flex items-center gap-0.5 justify-end">
                  <Flame size={13} /> {currentStreak} Days
                </span>
              </div>
              <div className="text-right">
                <span
                  className={`badge ${
                    attendanceRate >= 75 ? "badge-green" : "badge-warning"
                  } text-sm font-extrabold px-3 py-1`}
                >
                  {attendanceRate}% PRESENT
                </span>
              </div>
            </div>
          </div>

          {/* Quick 1-Click Action for Today */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <CalendarCheck size={14} className="text-green" /> Today's Session Check-In (Day {todayDay} — {currentMonthShort} {todayDay})
              </span>
              <span
                className={`badge ${
                  isTodayPresent ? "badge-green" : "badge-muted"
                } text-2xs`}
              >
                {isTodayPresent ? "✓ Present Today" : "Rest / Absent"}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleSetToday(true)}
                className={`btn btn-sm flex-1 flex items-center justify-center gap-1 ${
                  isTodayPresent ? "btn-primary" : "btn-secondary"
                }`}
              >
                <Check size={14} /> Mark Present Today
              </button>
              <button
                type="button"
                onClick={() => handleSetToday(false)}
                className={`btn btn-sm flex-1 flex items-center justify-center gap-1 ${
                  !isTodayPresent
                    ? "btn-secondary text-danger border-danger/40"
                    : "btn-secondary"
                }`}
              >
                <X size={14} /> Mark Absent / Rest Day
              </button>
            </div>
          </div>

          {/* Interactive Month Register Grid (Full 30 Days) */}
          <div>
            <div className="mb-2 flex items-center justify-between flex-wrap gap-1">
              <div>
                <span className="text-xs font-bold text-muted uppercase tracking-wider block">
                  Monthly Register ({daysInMonth} Days — {currentMonthName} {currentYear})
                </span>
                <span className="text-2xs text-muted">
                  Click any day to toggle between Present (✓) and Absent (✗)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleMarkAllPast(true)}
                  className="text-2xs text-green hover:underline"
                >
                  Mark all past present
                </button>
                <span className="text-muted text-2xs">|</span>
                <span className="text-2xs text-muted">
                  <span className="text-green font-bold">✓ Green</span> = Present |{" "}
                  <span className="text-danger font-bold">✗ Red</span> = Absent
                </span>
              </div>
            </div>

            {/* 30-Day Grid */}
            <div className="attendance-grid-interactive-30">
              {history.map((item) => {
                const isToday = item.day === todayDay;
                const isFuture = item.day > todayDay;

                return (
                  <button
                    type="button"
                    key={item.day}
                    onClick={() => handleToggleDay(item.day)}
                    className={`att-day-badge-interactive ${
                      item.present ? "present" : "absent"
                    } ${isToday ? "is-today" : ""} ${isFuture ? "is-future" : ""}`}
                    title={`Day ${item.day}: ${
                      item.present ? "Present (Click to toggle)" : "Absent / Rest Day (Click to toggle)"
                    }${isToday ? " [TODAY]" : ""}`}
                  >
                    <span className="att-symbol font-extrabold text-sm">
                      {item.present ? "✓" : "✗"}
                    </span>
                    <span className="att-day-label" style={{ fontSize: 11 }}>
                      Day {item.day}
                    </span>
                    {isToday && (
                      <span className="today-badge-chip">TODAY</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer mt-5 flex items-center justify-between pt-3 border-t border-white/10">
          <span className="text-xs text-muted flex items-center gap-1">
            <UserCheck size={13} className="text-green" />
            <span>
              Verified by: <strong className="text-white">{assignedCoach}</strong>
            </span>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm flex items-center gap-1.5"
              onClick={handleSave}
              disabled={saving}
            >
              <Save size={14} />
              {saving ? "Saving..." : "Save Attendance"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
