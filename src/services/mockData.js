// FIT-TRACK Shared Mock Database with localStorage persistence
// Powers full college demo functionality across Member, Trainer, and Admin roles

const STORAGE_KEYS = {
  MEMBERSHIPS: "fittrack_memberships",
  WORKOUTS: "fittrack_assigned_workouts",
  ATTENDANCE: "fittrack_attendance",
  PROGRESS: "fittrack_progress",
  MEMBERS: "fittrack_members_list",
  TRAINERS: "fittrack_trainers_list",
  REQUESTS: "fittrack_admin_requests",
  MESSAGES: "fittrack_chat_messages",
  TRAINER_NOTIFICATIONS: "fittrack_trainer_notifications",
  WORKOUT_LOGS: "fittrack_workout_logs",
};

// Clean Initial Data (No dummy members or trainers)
const initialMemberships = [];
const initialWorkouts = {};
const initialAttendance = {
  summary: { present: 0, absent: 0, total: 0 },
  memberHistory: [],
  todayLogs: [],
};
const initialTrainers = [];
const initialMembers = [];

// Automatically purge legacy dummy records from browser localStorage
const purgeDummyLocalStorage = () => {
  if (typeof window === "undefined") return;
  try {
    const PURGE_KEY = "fittrack_dummy_purged_v5";
    const memData = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    const trainerData = localStorage.getItem(STORAGE_KEYS.TRAINERS);
    const membershipData = localStorage.getItem(STORAGE_KEYS.MEMBERSHIPS);
    const progressData = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    const userData = localStorage.getItem("fittrack_user");

    const hasDummy =
      !localStorage.getItem(PURGE_KEY) ||
      (memData && (memData.includes("Amaan") || memData.includes("Marcus") || memData.includes("Rahul") || memData.includes("Alex") || memData.includes("Elena") || memData.includes("Tyler"))) ||
      (trainerData && (trainerData.includes("Marcus") || trainerData.includes("Elena") || trainerData.includes("Tyler"))) ||
      (membershipData && (membershipData.includes("Amaan") || membershipData.includes("mem_req_01")));

    if (hasDummy) {
      localStorage.removeItem(STORAGE_KEYS.MEMBERS);
      localStorage.removeItem(STORAGE_KEYS.TRAINERS);
      localStorage.removeItem(STORAGE_KEYS.MEMBERSHIPS);
      localStorage.removeItem(STORAGE_KEYS.WORKOUTS);
      localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
      localStorage.setItem(PURGE_KEY, "true");
    }

    // Always scrub any legacy dummy or fabricated form scores (e.g. 89, 92, 85, or unverified sessions)
    if (progressData) {
      try {
        const parsedProg = JSON.parse(progressData);
        let modified = false;
        Object.keys(parsedProg).forEach((key) => {
          const p = parsedProg[key];
          if (p) {
            const hasLegacyDummyScore = p.formScore === 89 || p.formScore === 92 || p.formScore === 85;
            const hasLegacyDummyHistory =
              Array.isArray(p.formHistory) &&
              p.formHistory.some(
                (h) =>
                  h.value === 89 ||
                  h.value === 92 ||
                  h.value === 85 ||
                  h.name === "Session 1" ||
                  h.name === "Session 2" ||
                  h.name === "Session 3" ||
                  h.name === "Day 1" ||
                  h.name === "Today" ||
                  !h.isRealSession
              );
            if (hasLegacyDummyScore || hasLegacyDummyHistory || !Array.isArray(p.formHistory) || p.formHistory.length === 0) {
              p.formScore = null;
              p.formHistory = [];
              modified = true;
            }
          }
        });
        if (modified) {
          localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(parsedProg));
        }
      } catch (e) {}
    }

    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        if (
          parsedUser.formScore === 89 ||
          parsedUser.formScore === 92 ||
          parsedUser.formScore === 85 ||
          (Array.isArray(parsedUser.formHistory) &&
            parsedUser.formHistory.some((h) => h.value === 89 || h.name === "Today" || !h.isRealSession))
        ) {
          parsedUser.formScore = null;
          parsedUser.formHistory = [];
          localStorage.setItem("fittrack_user", JSON.stringify(parsedUser));
        }
      } catch (e) {}
    }
  } catch (e) {
    // ignore
  }
};
purgeDummyLocalStorage();

// Helper get/set functions
export const getMemberships = () => {
  const data = localStorage.getItem(STORAGE_KEYS.MEMBERSHIPS);
  return data ? JSON.parse(data) : initialMemberships;
};

/**
 * Calculate dynamic days remaining from today until target expiry date
 */
export const calculateDaysRemaining = (endDateStr) => {
  if (!endDateStr) return null;

  let targetDate = new Date(endDateStr);

  // If standard parse failed (e.g. dd/mm/yyyy or custom format)
  if (isNaN(targetDate.getTime()) && typeof endDateStr === "string") {
    const parts = endDateStr.trim().split(/[\s\-/.]+/);
    if (parts.length === 3) {
      const monthNames = {
        jan: 0, january: 0,
        feb: 1, february: 1,
        mar: 2, march: 2,
        apr: 3, april: 3,
        may: 4,
        jun: 5, june: 5,
        jul: 6, july: 6,
        aug: 7, august: 7,
        sep: 8, september: 8,
        oct: 9, october: 9,
        nov: 10, november: 10,
        dec: 11, december: 11,
      };

      if (parts[0].length === 4) {
        // yyyy-mm-dd
        targetDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else if (isNaN(parts[1]) && monthNames[parts[1].toLowerCase()] !== undefined) {
        // dd Month yyyy (e.g. 20 March 2027)
        targetDate = new Date(parseInt(parts[2], 10), monthNames[parts[1].toLowerCase()], parseInt(parts[0], 10));
      } else {
        // dd-mm-yyyy
        targetDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
    }
  }

  if (isNaN(targetDate.getTime())) return null;

  const today = new Date();
  const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const diffTime = targetMidnight - todayMidnight;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Format membership expiry string with real dynamic remaining time
 */
export const formatExpiryRemaining = (endDateStr = "20 March 2027") => {
  const days = calculateDaysRemaining(endDateStr);
  const displayDate = endDateStr || "20 March 2027";

  if (days === null) {
    return `Expires: ${displayDate}`;
  }

  if (days < 0) {
    const d = Math.abs(days);
    return `Expired on ${displayDate} (${d} day${d === 1 ? "" : "s"} ago)`;
  }
  if (days === 0) {
    return `Expires Today (${displayDate})`;
  }
  if (days === 1) {
    return `Expires: ${displayDate} • 1 Day Remaining`;
  }
  return `Expires: ${displayDate} • ${days} Days Remaining`;
};

export const saveMemberships = (memberships) => {
  localStorage.setItem(STORAGE_KEYS.MEMBERSHIPS, JSON.stringify(memberships));
};

export const approveMembership = (id) => {
  const list = getMemberships();
  const updated = list.map((m) =>
    m.id === id
      ? { ...m, status: "active", endDate: "20 March 2027" }
      : m
  );
  saveMemberships(updated);

  // Also sync with members list
  const approvedItem = updated.find((m) => m.id === id);
  if (approvedItem) {
    const members = getMembersList();
    const updatedMembers = members.map((mem) =>
      mem.name === approvedItem.memberName || mem.email === approvedItem.memberEmail
        ? { ...mem, membershipStatus: "active", plan: approvedItem.plan }
        : mem
    );
    saveMembersList(updatedMembers);

    // If current logged-in user matches
    const currentUser = JSON.parse(localStorage.getItem("fittrack_user") || "{}");
    if (
      currentUser.name === approvedItem.memberName ||
      currentUser.email === approvedItem.memberEmail
    ) {
      currentUser.membership = approvedItem.plan;
      currentUser.membershipStatus = "active";
      currentUser.membershipExpiry = "20 March 2027";
      localStorage.setItem("fittrack_user", JSON.stringify(currentUser));
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("fittrack:membership-changed", { detail: { id, status: "active" } }));
  }

  return updated;
};

export const revokeMembership = (id) => {
  const list = getMemberships();
  const updated = list.map((m) =>
    m.id === id
      ? { ...m, status: "pending" }
      : m
  );
  saveMemberships(updated);

  const revokedItem = updated.find((m) => m.id === id);
  if (revokedItem) {
    const members = getMembersList();
    const updatedMembers = members.map((mem) =>
      mem.name === revokedItem.memberName || mem.email === revokedItem.memberEmail
        ? { ...mem, membershipStatus: "pending" }
        : mem
    );
    saveMembersList(updatedMembers);

    const currentUser = JSON.parse(localStorage.getItem("fittrack_user") || "{}");
    if (
      currentUser.name === revokedItem.memberName ||
      currentUser.email === revokedItem.memberEmail
    ) {
      currentUser.membershipStatus = "pending";
      localStorage.setItem("fittrack_user", JSON.stringify(currentUser));
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("fittrack:membership-changed", { detail: { id, status: "pending" } }));
  }

  return updated;
};

export const toggleMemberPaymentStatus = (memberIdentifier) => {
  const members = getMembersList();
  const mem = members.find((m) => m.id === memberIdentifier || m.email === memberIdentifier || m.name === memberIdentifier);
  if (!mem) return null;

  const newStatus = mem.membershipStatus === "active" ? "pending" : "active";

  const updatedMembers = members.map((m) =>
    m.id === mem.id ? { ...m, membershipStatus: newStatus } : m
  );
  saveMembersList(updatedMembers);

  // Sync memberships requests list
  const memberships = getMemberships();
  const updatedReqs = memberships.map((r) =>
    r.memberEmail === mem.email || r.memberName === mem.name
      ? { ...r, status: newStatus }
      : r
  );
  saveMemberships(updatedReqs);

  // Sync active user
  const currentUser = JSON.parse(localStorage.getItem("fittrack_user") || "{}");
  if (currentUser.email === mem.email || currentUser.name === mem.name) {
    currentUser.membershipStatus = newStatus;
    localStorage.setItem("fittrack_user", JSON.stringify(currentUser));
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("fittrack:membership-changed", { detail: { memberId: mem.id, status: newStatus } }));
  }

  return newStatus;
};

export const approveMemberPayment = (memberIdentifier) => {
  const members = getMembersList();
  const mem = members.find((m) => m.id === memberIdentifier || m.email === memberIdentifier || m.name === memberIdentifier);
  if (!mem) return null;

  const updatedMembers = members.map((m) =>
    m.id === mem.id ? { ...m, membershipStatus: "active" } : m
  );
  saveMembersList(updatedMembers);

  // Sync memberships requests list
  const memberships = getMemberships();
  const updatedReqs = memberships.map((r) =>
    r.memberEmail === mem.email || r.memberName === mem.name
      ? { ...r, status: "active", endDate: "20 March 2027" }
      : r
  );
  saveMemberships(updatedReqs);

  // Sync active user if matching
  const currentUser = JSON.parse(localStorage.getItem("fittrack_user") || "{}");
  if (currentUser.email === mem.email || currentUser.name === mem.name) {
    currentUser.membershipStatus = "active";
    currentUser.membership = mem.plan || "PRO";
    currentUser.membershipExpiry = "20 March 2027";
    localStorage.setItem("fittrack_user", JSON.stringify(currentUser));
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("fittrack:membership-changed", { detail: { memberId: mem.id, status: "active" } }));
  }

  return updatedMembers;
};


export const rejectMembership = (id) => {
  const list = getMemberships();
  const updated = list.map((m) =>
    m.id === id ? { ...m, status: "rejected" } : m
  );
  saveMemberships(updated);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("fittrack:membership-changed", { detail: { id, status: "rejected" } }));
  }

  return updated;
};

export const requestMembership = (memberName, memberEmail, planName) => {
  const list = getMemberships();
  const priceMap = { BASIC: "₹999", PRO: "₹1,999", PREMIUM: "₹2,999" };
  const newReq = {
    id: `mem_req_${Date.now()}`,
    memberName,
    memberEmail,
    plan: planName.toUpperCase(),
    price: priceMap[planName.toUpperCase()] || "₹1,999",
    paymentMethod: "Cash",
    status: "pending",
    requestedAt: "Just now",
    startDate: new Date().toLocaleDateString(),
    endDate: "20 March 2027",
  };

  const filtered = list.filter((m) => m.memberEmail !== memberEmail);
  const updated = [newReq, ...filtered];
  saveMemberships(updated);

  // Update current user
  const currentUser = JSON.parse(localStorage.getItem("fittrack_user") || "{}");
  currentUser.membership = planName.toUpperCase();
  currentUser.membershipStatus = "pending";
  currentUser.paymentMethod = "Cash";
  localStorage.setItem("fittrack_user", JSON.stringify(currentUser));

  return newReq;
};

export const getDefaultDailySplit = (memberName, trainerName = "Coach Zishan Desai") => {
  return {
    id: `wo_${Date.now()}`,
    name: "Chest + Triceps Routine",
    trainer: trainerName,
    date: "Today",
    status: "assigned", // "assigned" | "in-progress" | "completed"
    completedAt: null,
    exercises: [
      { id: 1, name: "Bench Press", sets: 3, reps: 10, completed: false },
      { id: 2, name: "Incline Press", sets: 3, reps: 12, completed: false },
      { id: 3, name: "Triceps Pushdown", sets: 3, reps: 12, completed: false },
    ],
  };
};

export const getAssignedWorkout = (memberName) => {
  if (!memberName) return null;
  const data = localStorage.getItem(STORAGE_KEYS.WORKOUTS);
  const workouts = data ? JSON.parse(data) : initialWorkouts;

  if (workouts[memberName]) {
    return workouts[memberName];
  }

  // Resolve assigned coach if available
  const members = getMembersList();
  const mem = members.find(
    (m) =>
      m.name?.toLowerCase() === memberName?.toLowerCase() ||
      m.email?.toLowerCase() === memberName?.toLowerCase()
  );

  if (mem) {
    if (mem.name && workouts[mem.name]) return workouts[mem.name];
    if (mem.email && workouts[mem.email]) return workouts[mem.email];
  }

  const matchKey = Object.keys(workouts).find(
    (k) => k.toLowerCase() === memberName.toLowerCase()
  );
  if (matchKey) return workouts[matchKey];

  const trainerName = mem?.trainerName ? `Coach ${mem.trainerName}` : "Coach Zishan Desai";

  // Provide the default active daily split so member can immediately start
  const defaultWorkout = getDefaultDailySplit(mem?.name || memberName, trainerName);
  workouts[memberName] = defaultWorkout;
  if (mem?.name) workouts[mem.name] = defaultWorkout;
  if (mem?.email) workouts[mem.email] = defaultWorkout;
  localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));
  return defaultWorkout;
};

export const saveAssignedWorkout = (memberName, workoutObj) => {
  const data = localStorage.getItem(STORAGE_KEYS.WORKOUTS);
  const workouts = data ? JSON.parse(data) : initialWorkouts;

  // Ensure default structure
  const updatedWorkout = {
    ...workoutObj,
    status: workoutObj.status || "assigned",
    completedAt: workoutObj.completedAt || null,
  };

  workouts[memberName] = updatedWorkout;

  const members = getMembersList();
  const mem = members.find(
    (m) =>
      m.name?.toLowerCase() === memberName?.toLowerCase() ||
      m.email?.toLowerCase() === memberName?.toLowerCase()
  );
  if (mem?.name) workouts[mem.name] = updatedWorkout;
  if (mem?.email) workouts[mem.email] = updatedWorkout;

  localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));

  const total = updatedWorkout.exercises?.length || 0;
  const done = updatedWorkout.exercises?.filter((e) => e.completed).length || 0;
  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;
  updateMemberProgressAndWorkoutStatus(memberName, progressPct, updatedWorkout);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("fittrack:workout-changed", { detail: { memberName, workout: updatedWorkout } }));
  }

  return workouts;
};

export const updateMemberProgressAndWorkoutStatus = (memberName, progressPct, workout) => {
  const members = getMembersList();
  const updatedMembers = members.map((m) => {
    if (m.name?.toLowerCase() === memberName?.toLowerCase() || m.email?.toLowerCase() === memberName?.toLowerCase()) {
      return {
        ...m,
        progress: progressPct,
        todayWorkout: {
          name: workout.name,
          status: workout.status,
          completedAt: workout.completedAt,
          completedCount: workout.exercises?.filter((e) => e.completed).length || 0,
          totalCount: workout.exercises?.length || 0,
        },
      };
    }
    return m;
  });
  saveMembersList(updatedMembers);

  // Sync current user in localStorage and recalculate progress metrics
  try {
    const currentUser = JSON.parse(localStorage.getItem("fittrack_user") || "{}");
    if (currentUser.name?.toLowerCase() === memberName?.toLowerCase() || currentUser.email?.toLowerCase() === memberName?.toLowerCase()) {
      currentUser.progress = progressPct;
      currentUser.todayWorkout = {
        name: workout.name,
        status: workout.status,
        completedAt: workout.completedAt,
        completedCount: workout.exercises?.filter((e) => e.completed).length || 0,
        totalCount: workout.exercises?.length || 0,
      };
      localStorage.setItem("fittrack_user", JSON.stringify(currentUser));
    }
  } catch (e) {
    // ignore
  }

  // Update real-time progress metrics (workoutsCount, weekly frequency, form scores, attendance)
  getMemberProgressMetrics(memberName);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("fittrack:progress-updated", { detail: { memberName, workout } }));
  }
};

export const getMemberProgressMetrics = (memberIdentifier, fallbackUser = null) => {
  const memberKey = (memberIdentifier || "").toLowerCase().trim();

  // 1. Stored progress map
  let allProgress = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    if (raw) allProgress = JSON.parse(raw);
  } catch (e) {}

  // Resolve canonical member info from members roster or fallbackUser
  const members = getMembersList();
  const currentMem = members.find(
    (m) =>
      (m.email && m.email.toLowerCase() === memberKey) ||
      (m.name && m.name.toLowerCase() === memberKey) ||
      (m.id && String(m.id).toLowerCase() === memberKey) ||
      (fallbackUser?.email && m.email?.toLowerCase() === fallbackUser.email.toLowerCase()) ||
      (fallbackUser?.name && m.name?.toLowerCase() === fallbackUser.name.toLowerCase())
  );

  const canonicalKey = (currentMem?.email || fallbackUser?.email || memberKey).toLowerCase().trim();
  const canonicalName = currentMem?.name || fallbackUser?.name || memberIdentifier || "Member";

  let memberProgress =
    allProgress[canonicalKey] ||
    (canonicalName ? allProgress[canonicalName.toLowerCase().trim()] : null) ||
    allProgress[memberKey] ||
    {};

  // 2. Workout completion logs
  let allLogs = [];
  try {
    const logsRaw = localStorage.getItem(STORAGE_KEYS.WORKOUT_LOGS);
    if (logsRaw) allLogs = JSON.parse(logsRaw);
  } catch (e) {}

  const memberLogs = allLogs.filter((l) => {
    const lName = (l.memberName || "").toLowerCase().trim();
    const lEmail = (l.memberEmail || "").toLowerCase().trim();
    return (
      (lName && (lName === memberKey || lName === canonicalKey || lName === canonicalName.toLowerCase())) ||
      (lEmail && (lEmail === memberKey || lEmail === canonicalKey || lEmail === canonicalName.toLowerCase()))
    );
  });

  // 3. Current active workout
  const currentWorkout = getAssignedWorkout(canonicalName) || getAssignedWorkout(memberIdentifier);
  const isTodayCompleted =
    currentWorkout?.status === "completed" ||
    (currentWorkout?.exercises?.length > 0 &&
      currentWorkout.exercises.every((e) => e.completed));

  // 4. Calculate total workouts count
  let totalWorkoutsCount = Math.max(
    memberLogs.length,
    memberProgress.workoutsCount || fallbackUser?.workoutsCount || 0
  );
  if (isTodayCompleted && totalWorkoutsCount === 0) {
    totalWorkoutsCount = 1;
  }

  // 5. Weekly Workouts Frequency (Mon - Sun)
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayDayIdx = new Date().getDay();
  const todayName = dayNames[todayDayIdx]; // e.g. "Sat"

  const weeklyMap = {
    Mon: 0,
    Tue: 0,
    Wed: 0,
    Thu: 0,
    Fri: 0,
    Sat: 0,
    Sun: 0,
  };

  // Populate from stored data if present
  if (Array.isArray(memberProgress.weeklyWorkouts)) {
    memberProgress.weeklyWorkouts.forEach((w) => {
      if (w && w.name && typeof w.count === "number") {
        weeklyMap[w.name] = w.count;
      }
    });
  }

  // Add recent completion logs from last 7 days
  memberLogs.forEach((log) => {
    if (log.timestamp) {
      const logDate = new Date(log.timestamp);
      const diffDays = (new Date() - logDate) / (1000 * 60 * 60 * 24);
      if (diffDays <= 7) {
        const dName = dayNames[logDate.getDay()];
        weeklyMap[dName] = Math.max(1, (weeklyMap[dName] || 0) + 1);
      }
    }
  });

  // If today is completed, ensure today has >= 1 session
  if (isTodayCompleted) {
    weeklyMap[todayName] = Math.max(1, (weeklyMap[todayName] || 0) + 1);
  }

  // Also check attendance record for present days this week to populate weekly bars
  const attRecord = getMemberAttendanceRecord(canonicalName || memberIdentifier);
  const todayDateNum = new Date().getDate();
  if (attRecord?.history) {
    attRecord.history.forEach((h) => {
      if (h.present && h.day <= todayDateNum) {
        const dObj = new Date(new Date().getFullYear(), new Date().getMonth(), h.day);
        const dayDiff = (new Date() - dObj) / (1000 * 60 * 60 * 24);
        if (dayDiff >= 0 && dayDiff <= 7) {
          const dName = dayNames[dObj.getDay()];
          weeklyMap[dName] = Math.max(1, weeklyMap[dName] || 1);
        }
      }
    });
  }

  // Ensure if totalWorkoutsCount > 0 and all days are 0, today gets at least 1 session
  if (totalWorkoutsCount > 0 && Object.values(weeklyMap).every((v) => v === 0)) {
    weeklyMap[todayName] = 1;
  }

  const weeklyWorkouts = [
    { name: "Mon", count: weeklyMap.Mon },
    { name: "Tue", count: weeklyMap.Tue },
    { name: "Wed", count: weeklyMap.Wed },
    { name: "Thu", count: weeklyMap.Thu },
    { name: "Fri", count: weeklyMap.Fri },
    { name: "Sat", count: weeklyMap.Sat },
    { name: "Sun", count: weeklyMap.Sun },
  ];

  // Sanitize any legacy dummy entries from localStorage
  if (Array.isArray(memberProgress.weightHistory)) {
    if (memberProgress.weightHistory.some((h) => h.name?.includes("Wks Ago") || h.name?.includes("Last Wk"))) {
      memberProgress.weightHistory = null;
    }
  }

  // Strict Zero Dummy Data: Only real sessions recorded via camera
  let formHistory = [];
  if (Array.isArray(memberProgress.formHistory)) {
    formHistory = memberProgress.formHistory.filter(
      (h) => h && h.isRealSession && h.value !== 89 && h.name !== "Today"
    );
  }

  // If no sessions exist, avgFormScore MUST be null. NEVER fall back to legacy cached dummy scores!
  const avgFormScore =
    formHistory.length > 0
      ? Math.round(
          formHistory.reduce((acc, h) => acc + (Number(h.value) || 0), 0) /
            formHistory.length
        )
      : null;

  // 7. Weight History (Only genuine logged weigh-ins)
  const curWeight = Number(
    currentMem?.weight || fallbackUser?.weight || 60
  );
  const targetWeight = Number(
    currentMem?.targetWeight || fallbackUser?.targetWeight || 65
  );

  let weightHistory = Array.isArray(memberProgress.weightHistory)
    ? memberProgress.weightHistory.filter((h) => !h.name?.includes("Wks Ago") && !h.name?.includes("Last Wk"))
    : [];

  if (weightHistory.length === 0 && curWeight) {
    weightHistory = [{ name: "Current", value: curWeight, date: "Today" }];
  } else if (weightHistory.length > 0) {
    const lastItem = weightHistory[weightHistory.length - 1];
    if (lastItem && (lastItem.name === "Current" || lastItem.name === "Today")) {
      lastItem.value = curWeight;
    }
  }

  // 8. Real-time Attendance Rate (Strictly from real attendance records or user)
  let attendanceRate = 0;
  if (attRecord?.attendanceRate !== undefined && attRecord?.attendanceRate !== null) {
    attendanceRate = Number(attRecord.attendanceRate);
  } else if (fallbackUser?.attendance !== undefined && fallbackUser?.attendance !== null) {
    attendanceRate = Number(fallbackUser.attendance);
  }

  const result = {
    workoutsCount: totalWorkoutsCount,
    weeklyWorkouts,
    totalWeeklySessions: weeklyWorkouts.reduce((acc, w) => acc + w.count, 0),
    formScore: avgFormScore,
    formHistory,
    weight: curWeight,
    targetWeight,
    weightHistory,
    attendance: attendanceRate,
    isTodayCompleted,
    latestAiSetSummary: memberProgress.latestAiSetSummary || fallbackUser?.latestAiSetSummary || null,
  };

  // Persist under all lookup keys for cross-retrieval
  allProgress[canonicalKey] = { ...memberProgress, ...result };
  if (canonicalName) {
    allProgress[canonicalName.toLowerCase().trim()] = { ...memberProgress, ...result };
  }
  if (memberKey) {
    allProgress[memberKey] = { ...memberProgress, ...result };
  }

  try {
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(allProgress));
  } catch (e) {}

  // Cross-sync with localStorage fittrack_user
  try {
    const localUser = JSON.parse(localStorage.getItem("fittrack_user") || "{}");
    if (
      (localUser.name && localUser.name.toLowerCase() === canonicalName.toLowerCase()) ||
      (localUser.email && localUser.email.toLowerCase() === canonicalKey) ||
      (localUser.name && localUser.name.toLowerCase() === memberKey) ||
      (localUser.email && localUser.email.toLowerCase() === memberKey)
    ) {
      localUser.workoutsCount = totalWorkoutsCount;
      localUser.attendance = attendanceRate;
      localUser.formScore = avgFormScore;
      localUser.weeklyWorkouts = weeklyWorkouts;
      localUser.formHistory = formHistory;
      localUser.weightHistory = weightHistory;
      localUser.weight = curWeight;
      localUser.targetWeight = targetWeight;
      if (memberProgress.latestAiSetSummary) {
        localUser.latestAiSetSummary = memberProgress.latestAiSetSummary;
      }
      localStorage.setItem("fittrack_user", JSON.stringify(localUser));
    }
  } catch (e) {}

  return result;
};

export const logMemberWeighIn = (memberIdentifier, newWeight, newTargetWeight = null) => {
  const memberKey = (memberIdentifier || "").toLowerCase().trim();
  const weightNum = Number(newWeight);
  if (!weightNum || isNaN(weightNum)) return null;

  // 1. Update members roster
  const members = getMembersList();
  const currentMem = members.find(
    (m) =>
      m.name?.toLowerCase() === memberKey ||
      m.email?.toLowerCase() === memberKey
  );
  if (currentMem) {
    currentMem.weight = weightNum;
    if (newTargetWeight) currentMem.targetWeight = Number(newTargetWeight);
    saveMembersList(members);
  }

  // 2. Update progress weight history
  let allProgress = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    if (raw) allProgress = JSON.parse(raw);
  } catch (e) {}

  const canonicalKey = (currentMem?.email || memberKey).toLowerCase().trim();
  const canonicalName = currentMem?.name || memberIdentifier;

  const memberProgress =
    allProgress[canonicalKey] ||
    (canonicalName ? allProgress[canonicalName.toLowerCase().trim()] : null) ||
    allProgress[memberKey] ||
    {};

  let history = Array.isArray(memberProgress.weightHistory)
    ? memberProgress.weightHistory.filter((h) => !h.name?.includes("Wks Ago") && !h.name?.includes("Last Wk"))
    : [];

  const nowLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  history.push({ name: nowLabel, value: weightNum });

  if (history.length > 8) {
    history = history.slice(history.length - 8);
  }

  memberProgress.weight = weightNum;
  if (newTargetWeight) memberProgress.targetWeight = Number(newTargetWeight);
  memberProgress.weightHistory = history;

  allProgress[canonicalKey] = memberProgress;
  if (canonicalName) allProgress[canonicalName.toLowerCase().trim()] = memberProgress;
  allProgress[memberKey] = memberProgress;

  try {
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(allProgress));
  } catch (e) {}

  // 3. Update localStorage user
  try {
    const localUser = JSON.parse(localStorage.getItem("fittrack_user") || "{}");
    if (
      (localUser.name && localUser.name.toLowerCase() === canonicalName.toLowerCase()) ||
      (localUser.email && localUser.email.toLowerCase() === canonicalKey) ||
      (localUser.name && localUser.name.toLowerCase() === memberKey) ||
      (localUser.email && localUser.email.toLowerCase() === memberKey)
    ) {
      localUser.weight = weightNum;
      if (newTargetWeight) localUser.targetWeight = Number(newTargetWeight);
      localUser.weightHistory = history;
      localStorage.setItem("fittrack_user", JSON.stringify(localUser));
    }
  } catch (e) {}

  const freshMetrics = getMemberProgressMetrics(canonicalName || memberIdentifier);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("fittrack:progress-updated", {
        detail: { memberName: canonicalName, weight: weightNum, metrics: freshMetrics },
      })
    );
  }

  return freshMetrics;
};

export const toggleExerciseCompletion = (memberName, exerciseId) => {
  if (!memberName) return null;
  const data = localStorage.getItem(STORAGE_KEYS.WORKOUTS);
  const workouts = data ? JSON.parse(data) : {};
  let workout = workouts[memberName] || getAssignedWorkout(memberName);

  if (!workout || !workout.exercises) return null;

  workout.exercises = workout.exercises.map((ex) =>
    ex.id === exerciseId ? { ...ex, completed: !ex.completed } : ex
  );

  const completedCount = workout.exercises.filter((ex) => ex.completed).length;
  const totalCount = workout.exercises.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (completedCount === totalCount && totalCount > 0) {
    workout.status = "completed";
    workout.completedAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " Today";
    logWorkoutCompletion(memberName, workout);
  } else if (completedCount > 0) {
    workout.status = "in-progress";
    workout.completedAt = null;
  } else {
    workout.status = "assigned";
    workout.completedAt = null;
  }

  workouts[memberName] = workout;
  localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));

  updateMemberProgressAndWorkoutStatus(memberName, progressPct, workout);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("fittrack:workout-changed", { detail: { memberName, workout } }));
    if (workout.status === "completed") {
      window.dispatchEvent(new CustomEvent("fittrack:workout-completed", { detail: { memberName, workout } }));
    }
  }

  return workout;
};

export const completeMemberWorkout = (memberName, feedback = "") => {
  if (!memberName) return null;
  const data = localStorage.getItem(STORAGE_KEYS.WORKOUTS);
  const workouts = data ? JSON.parse(data) : {};
  let workout = workouts[memberName] || getAssignedWorkout(memberName);

  if (!workout) return null;

  workout.exercises = (workout.exercises || []).map((ex) => ({ ...ex, completed: true }));
  workout.status = "completed";
  workout.completedAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " Today";
  workout.feedback = feedback;

  workouts[memberName] = workout;
  localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));

  updateMemberProgressAndWorkoutStatus(memberName, 100, workout);
  logWorkoutCompletion(memberName, workout);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("fittrack:workout-changed", { detail: { memberName, workout } }));
    window.dispatchEvent(new CustomEvent("fittrack:workout-completed", { detail: { memberName, workout } }));
    window.dispatchEvent(new CustomEvent("fittrack:membership-changed"));
  }

  return workout;
};

export const resetMemberWorkout = (memberName) => {
  if (!memberName) return null;
  const data = localStorage.getItem(STORAGE_KEYS.WORKOUTS);
  const workouts = data ? JSON.parse(data) : {};
  let workout = workouts[memberName] || getAssignedWorkout(memberName);

  if (!workout) return null;

  workout.exercises = (workout.exercises || []).map((ex) => ({ ...ex, completed: false }));
  workout.status = "assigned";
  workout.completedAt = null;

  workouts[memberName] = workout;
  localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));

  updateMemberProgressAndWorkoutStatus(memberName, 0, workout);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("fittrack:workout-changed", { detail: { memberName, workout } }));
  }

  return workout;
};

const logWorkoutCompletion = (memberName, workout) => {
  try {
    const logsData = localStorage.getItem(STORAGE_KEYS.WORKOUT_LOGS);
    const logs = logsData ? JSON.parse(logsData) : [];
    logs.unshift({
      id: `log_${Date.now()}`,
      memberName,
      workoutName: workout.name,
      trainer: workout.trainer,
      exercisesCount: workout.exercises.length,
      completedAt: workout.completedAt,
      date: new Date().toLocaleDateString(),
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem(STORAGE_KEYS.WORKOUT_LOGS, JSON.stringify(logs.slice(0, 50)));

    const notifsData = localStorage.getItem(STORAGE_KEYS.TRAINER_NOTIFICATIONS);
    const notifs = notifsData ? JSON.parse(notifsData) : [];
    notifs.unshift({
      id: `notif_${Date.now()}`,
      memberName,
      workoutName: workout.name,
      completedAt: workout.completedAt,
      timestamp: new Date().toISOString(),
      text: `${memberName} completed today's ${workout.name}! (${workout.exercises.length}/${workout.exercises.length} exercises finished)`,
      read: false,
    });
    localStorage.setItem(STORAGE_KEYS.TRAINER_NOTIFICATIONS, JSON.stringify(notifs.slice(0, 30)));
  } catch (e) {
    // ignore
  }
};

export const getTrainerNotifications = () => {
  try {
    const notifsData = localStorage.getItem(STORAGE_KEYS.TRAINER_NOTIFICATIONS);
    return notifsData ? JSON.parse(notifsData) : [];
  } catch {
    return [];
  }
};

export const getMemberWorkoutStatus = (memberName) => {
  const workout = getAssignedWorkout(memberName);
  if (!workout) return { hasWorkout: false, status: "none", progress: 0, completedCount: 0, totalCount: 0 };
  const completedCount = workout.exercises?.filter((e) => e.completed).length || 0;
  const totalCount = workout.exercises?.length || 0;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  return {
    hasWorkout: true,
    workout,
    status: workout.status || (completedCount === totalCount && totalCount > 0 ? "completed" : completedCount > 0 ? "in-progress" : "assigned"),
    completedAt: workout.completedAt,
    completedCount,
    totalCount,
    progress,
  };
};

export const getMembersList = () => {
  const data = localStorage.getItem(STORAGE_KEYS.MEMBERS);
  return data ? JSON.parse(data) : initialMembers;
};

export const saveMembersList = (members) => {
  localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
};

export const getTrainersList = () => {
  const data = localStorage.getItem(STORAGE_KEYS.TRAINERS);
  return data ? JSON.parse(data) : initialTrainers;
};

export const saveTrainersList = (trainers) => {
  localStorage.setItem(STORAGE_KEYS.TRAINERS, JSON.stringify(trainers));
};

export const getAttendanceData = () => {
  const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
  return data ? JSON.parse(data) : initialAttendance;
};

export const saveAttendanceData = (att) => {
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(att));
};

// ==========================================
// ATHLETE ATTENDANCE (MANAGED BY TRAINER)
// ==========================================

export const getMemberAttendanceRecord = (memberIdentifier) => {
  const att = getAttendanceData();
  const byMember = att.byMember || {};
  const key = (memberIdentifier || "").toLowerCase().trim();

  // Dynamic Date calculations
  const now = new Date();
  const today = now.getDate();
  const currentMonthName = now.toLocaleString("en-US", { month: "long" });
  const currentYear = now.getFullYear();
  // Guaranteed minimum 30 days for full month register
  const daysInMonth = Math.max(30, new Date(currentYear, now.getMonth() + 1, 0).getDate());

  // Helper to ensure an existing or new history array has all 30 days
  const buildFullMonthHistory = (existingHistory = []) => {
    const map = new Map();
    if (Array.isArray(existingHistory)) {
      existingHistory.forEach((h) => {
        if (h && typeof h.day === "number") {
          map.set(h.day, !!h.present);
        }
      });
    }

    const fullHistory = [];
    for (let d = 1; d <= daysInMonth; d++) {
      if (map.has(d)) {
        fullHistory.push({ day: d, present: map.get(d) });
      } else {
        // Real user default: not attended until check-in is logged
        fullHistory.push({
          day: d,
          present: false,
        });
      }
    }
    return fullHistory;
  };

  // 1. Check direct key match
  let existing = null;
  if (byMember[key] && Array.isArray(byMember[key].history)) {
    existing = byMember[key];
  } else {
    // 2. Check alias matches
    for (const k of Object.keys(byMember)) {
      if (k && key && (key.includes(k) || k.includes(key))) {
        existing = byMember[k];
        break;
      }
    }
  }

  // Cross-reference members list to get coach info
  const members = getMembersList();
  const mem = members.find(
    (m) =>
      m.email?.toLowerCase() === key ||
      m.name?.toLowerCase() === key ||
      (key && m.email?.toLowerCase()?.includes(key)) ||
      (key && m.name?.toLowerCase()?.includes(key))
  );

  const fullHistory = buildFullMonthHistory(existing ? existing.history : []);
  const presentCount = fullHistory.filter((h) => h.present).length;
  // Recorded days = up to today, or any future days marked present
  const recordedDays = Math.max(today, fullHistory.filter((h, idx) => idx + 1 <= today || h.present).length);
  const attendanceRate = Math.min(100, Math.round((presentCount / Math.max(1, recordedDays)) * 100));

  const record = {
    member: memberIdentifier,
    month: currentMonthName,
    year: currentYear,
    daysCount: daysInMonth,
    history: fullHistory,
    attendanceRate,
    updatedBy: mem?.trainerName ? `Coach ${mem.trainerName}` : (existing?.updatedBy || "Assigned Coach"),
    updatedAt: existing?.updatedAt || `Active ${currentMonthName} Cycle`,
  };

  if (key) {
    byMember[key] = record;
    if (mem?.email) byMember[mem.email.toLowerCase().trim()] = record;
    if (mem?.name) byMember[mem.name.toLowerCase().trim()] = record;
    if (mem?.id) byMember[mem.id] = record;

    saveAttendanceData({
      ...att,
      byMember,
      memberHistory: fullHistory,
    });
  }

  return record;
};

export const updateAthleteAttendanceByTrainer = (memberIdentifier, updatedHistory, trainerName) => {
  const att = getAttendanceData();
  const byMember = att.byMember || {};
  const key = (memberIdentifier || "").toLowerCase().trim();

  const now = new Date();
  const today = now.getDate();
  const currentMonthName = now.toLocaleString("en-US", { month: "long" });
  const currentYear = now.getFullYear();

  const presentCount = updatedHistory.filter((h) => h.present).length;
  const recordedDays = Math.max(today, updatedHistory.filter((h, idx) => idx + 1 <= today || h.present).length);
  const attendanceRate = Math.min(100, Math.round((presentCount / Math.max(1, recordedDays)) * 100));

  const formattedTrainer = trainerName
    ? (trainerName.startsWith("Coach") ? trainerName : `Coach ${trainerName}`)
    : "Trainer";

  const nowTime = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const record = {
    member: memberIdentifier,
    month: currentMonthName,
    year: currentYear,
    daysCount: updatedHistory.length,
    history: updatedHistory,
    attendanceRate,
    updatedBy: formattedTrainer,
    updatedAt: `Today at ${nowTime}`,
  };

  byMember[key] = record;

  // Cross-sync with members roster
  const members = getMembersList();
  const currentMem = members.find(
    (m) =>
      m.email?.toLowerCase() === key ||
      m.name?.toLowerCase() === key ||
      (key && m.email?.toLowerCase()?.includes(key)) ||
      (key && m.name?.toLowerCase()?.includes(key))
  );

  if (currentMem) {
    currentMem.attendance = attendanceRate;
    saveMembersList(members);

    if (currentMem.email) byMember[currentMem.email.toLowerCase().trim()] = record;
    if (currentMem.name) byMember[currentMem.name.toLowerCase().trim()] = record;
    if (currentMem.id) byMember[currentMem.id] = record;
  }

  // Cross-sync currently logged-in user in localStorage
  try {
    const localUser = JSON.parse(localStorage.getItem("fittrack_user") || "{}");
    if (
      localUser.email?.toLowerCase() === key ||
      localUser.name?.toLowerCase() === key ||
      (currentMem && (localUser.email === currentMem.email || localUser.name === currentMem.name))
    ) {
      localUser.attendance = attendanceRate;
      localStorage.setItem("fittrack_user", JSON.stringify(localUser));
    }
  } catch {
    // ignore
  }

  saveAttendanceData({
    ...att,
    byMember,
    memberHistory: updatedHistory,
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("fittrack:attendance-changed", {
        detail: { memberIdentifier, record },
      })
    );

    // Asynchronous backend sync if online
    (async () => {
      try {
        const api = (await import("./api")).default;
        const targetId = currentMem?.id || currentMem?._id || memberIdentifier;
        if (targetId) {
          await api.put(`/attendance/member/${targetId}`, {
            history: updatedHistory,
            attendanceRate,
            trainerName: formattedTrainer,
          });
        }
      } catch {
        // Local fallback
      }
    })();
  }

  return record;
};

export const logSmartAttendanceCheckIn = async ({
  email,
  password,
  memberName,
  role = "member",
  method = "QR Turnstile Mobile Scan",
}) => {
  const normEmail = (email || "").toLowerCase().trim();
  const normName = (memberName || "").trim();

  // 1. Authenticate user against registered rosters
  let matchedUser = null;
  const members = getMembersList();
  const trainers = getTrainersList();

  if (normEmail) {
    matchedUser =
      members.find((m) => m.email?.toLowerCase() === normEmail) ||
      trainers.find((t) => t.email?.toLowerCase() === normEmail);
  } else if (normName) {
    matchedUser =
      members.find((m) => m.name?.toLowerCase() === normName.toLowerCase()) ||
      trainers.find((t) => t.name?.toLowerCase() === normName.toLowerCase());
  }

  // If password provided, attempt backend authentication
  if (password && normEmail) {
    try {
      const api = (await import("./api")).default;
      const res = await api.post("/auth/login", { email: normEmail, password });
      if (res.data?.success && res.data?.user) {
        matchedUser = { ...matchedUser, ...res.data.user };
        // Store session token if logging in from phone browser
        if (res.data.token && typeof localStorage !== "undefined") {
          localStorage.setItem("fittrack_token", res.data.token);
          localStorage.setItem("fittrack_user", JSON.stringify(res.data.user));
        }
      }
    } catch (err) {
      if (!matchedUser) {
        throw new Error(
          err?.response?.data?.message ||
            "Invalid credentials. Please verify your email and password."
        );
      }
    }
  }

  if (!matchedUser) {
    // Check currently active localStorage session
    try {
      const localUser = JSON.parse(localStorage.getItem("fittrack_user") || "{}");
      if (localUser.email || localUser.name) {
        matchedUser = localUser;
      }
    } catch {}
  }

  if (!matchedUser) {
    throw new Error(
      "Account not found. Please enter a valid registered member or trainer email."
    );
  }

  const displayName = matchedUser.name || matchedUser.email || "Member";
  const userRole = matchedUser.role || role || "member";
  const userIdentifier = matchedUser.email || matchedUser.name || displayName;

  // 2. Mark today's calendar day as present
  const record = getMemberAttendanceRecord(userIdentifier);
  const now = new Date();
  const today = now.getDate();
  const updatedHistory = (record.history || []).map((h) => {
    if (h.day === today) {
      return { ...h, present: true };
    }
    return h;
  });

  const updatedRecord = updateAthleteAttendanceByTrainer(
    userIdentifier,
    updatedHistory,
    "Turnstile QR Terminal"
  );

  // 3. Prepend to today's live facility check-in logs
  const att = getAttendanceData();
  const nowTime = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const newLog = {
    id: `att_qr_${Date.now()}`,
    name: displayName,
    email: matchedUser.email || "",
    role: userRole.toUpperCase(),
    time: nowTime,
    method: method || "QR Turnstile Mobile Scan",
    status: "Verified & Present",
  };

  // Check if already checked in recently to prevent duplicates
  const existingLog = (att.todayLogs || []).find(
    (l) =>
      (l.email && l.email === matchedUser.email && l.time?.substring(0, 5) === nowTime.substring(0, 5)) ||
      (l.name === displayName && l.time?.substring(0, 5) === nowTime.substring(0, 5))
  );

  const updatedLogs = existingLog ? att.todayLogs : [newLog, ...(att.todayLogs || [])];
  const updatedSummary = {
    ...att.summary,
    present: existingLog ? att.summary.present : att.summary.present + 1,
    absent: existingLog ? att.summary.absent : Math.max(0, att.summary.absent - 1),
  };

  saveAttendanceData({
    ...att,
    todayLogs: updatedLogs,
    summary: updatedSummary,
  });

  // 4. Update member's progress metrics
  getMemberProgressMetrics(displayName, matchedUser);

  // 5. Broadcast real-time cross-tab and storage events
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("fittrack:attendance-changed", {
        detail: {
          user: matchedUser,
          record: updatedRecord,
          log: newLog,
          time: nowTime,
        },
      })
    );
  }

  return {
    success: true,
    user: matchedUser,
    record: updatedRecord,
    log: newLog,
    timestamp: nowTime,
  };
};

export const markAthleteTodayAttendance = (memberIdentifier, isPresent, trainerName) => {
  const currentRecord = getMemberAttendanceRecord(memberIdentifier);
  const todayDay = new Date().getDate();

  let foundToday = false;
  const updatedHistory = currentRecord.history.map((item) => {
    if (item.day === todayDay) {
      foundToday = true;
      return { ...item, present: isPresent };
    }
    return item;
  });

  if (!foundToday) {
    updatedHistory.push({
      day: todayDay,
      present: isPresent,
    });
    updatedHistory.sort((a, b) => a.day - b.day);
  }

  return updateAthleteAttendanceByTrainer(memberIdentifier, updatedHistory, trainerName);
};


export const resetAllDummyData = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEYS.MEMBERS);
    localStorage.removeItem(STORAGE_KEYS.TRAINERS);
    localStorage.removeItem(STORAGE_KEYS.MEMBERSHIPS);
    localStorage.removeItem(STORAGE_KEYS.WORKOUTS);
    localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
    localStorage.removeItem(STORAGE_KEYS.REQUESTS);
    localStorage.removeItem(STORAGE_KEYS.MESSAGES);
    window.dispatchEvent(new CustomEvent("fittrack:membership-changed"));
    window.dispatchEvent(new CustomEvent("fittrack:assignment-changed"));
    window.dispatchEvent(new CustomEvent("fittrack:request-changed"));
    window.dispatchEvent(new CustomEvent("fittrack:chat-changed"));
  }
};

// ==========================================
// TRAINER ASSIGNMENT & ROSTER HELPERS
// ==========================================

export const assignMemberToTrainer = (memberIdentifier, trainerIdentifier) => {
  const members = getMembersList();
  const trainers = getTrainersList();

  const trainer = trainers.find(
    (t) => t.id === trainerIdentifier || t._id === trainerIdentifier || t.email === trainerIdentifier || t.name === trainerIdentifier
  );
  if (!trainer) return { success: false, message: "Trainer not found" };

  const member = members.find(
    (m) => m.id === memberIdentifier || m._id === memberIdentifier || m.email === memberIdentifier || m.name === memberIdentifier
  );
  if (!member) return { success: false, message: "Member not found" };

  const updatedMembers = members.map((m) => {
    if (m.id === member.id || m.email === member.email) {
      return {
        ...m,
        trainerId: trainer.id || trainer._id,
        trainerName: trainer.name,
        trainerSpecialty: trainer.specialty || "Fitness Coach",
      };
    }
    return m;
  });

  saveMembersList(updatedMembers);

  // Sync active logged-in user if matching
  const currentUser = JSON.parse(localStorage.getItem("fittrack_user") || "{}");
  if (currentUser.email === member.email || currentUser.name === member.name) {
    currentUser.trainerId = trainer.id || trainer._id;
    currentUser.trainerName = trainer.name;
    currentUser.trainerSpecialty = trainer.specialty || "Fitness Coach";
    localStorage.setItem("fittrack_user", JSON.stringify(currentUser));
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("fittrack:assignment-changed", { detail: { member, trainer } }));
  }

  return { success: true, member: { ...member, trainerId: trainer.id || trainer._id, trainerName: trainer.name } };
};

export const removeMemberFromTrainer = (memberIdentifier) => {
  const members = getMembersList();
  const member = members.find(
    (m) => m.id === memberIdentifier || m._id === memberIdentifier || m.email === memberIdentifier || m.name === memberIdentifier
  );
  if (!member) return { success: false, message: "Member not found" };

  const updatedMembers = members.map((m) => {
    if (m.id === member.id || m.email === member.email) {
      return {
        ...m,
        trainerId: null,
        trainerName: null,
        trainerSpecialty: null,
      };
    }
    return m;
  });

  saveMembersList(updatedMembers);

  // Sync active logged-in user if matching
  const currentUser = JSON.parse(localStorage.getItem("fittrack_user") || "{}");
  if (currentUser.email === member.email || currentUser.name === member.name) {
    currentUser.trainerId = null;
    currentUser.trainerName = null;
    currentUser.trainerSpecialty = null;
    localStorage.setItem("fittrack_user", JSON.stringify(currentUser));
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("fittrack:assignment-changed", { detail: { member, unassigned: true } }));
  }

  return { success: true, message: "Trainer removed successfully" };
};

export const getAvailableProMembers = () => {
  const members = getMembersList();
  return members.filter((m) => {
    const isPro = (m.plan === "PRO" || m.plan === "PREMIUM" || m.membership === "PRO" || m.membership === "PREMIUM") &&
                  m.membershipStatus === "active";
    const hasNoTrainer = !m.trainerId || m.trainerId === "null" || m.trainerId === "";
    return isPro && hasNoTrainer;
  });
};

// ==========================================
// ADMIN APPROVAL REQUESTS
// ==========================================

export const getAdminRequests = (filter = {}) => {
  const data = localStorage.getItem(STORAGE_KEYS.REQUESTS);
  let list = data ? JSON.parse(data) : [];

  if (filter.requesterId) {
    list = list.filter((r) => r.requesterId === filter.requesterId);
  }
  if (filter.requesterEmail) {
    list = list.filter((r) => r.requesterEmail?.toLowerCase() === filter.requesterEmail?.toLowerCase());
  }
  if (filter.status && filter.status !== "all") {
    list = list.filter((r) => r.status === filter.status);
  }
  if (filter.role && filter.role !== "all") {
    list = list.filter((r) => r.requesterRole === filter.role);
  }

  return list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
};

export const saveAdminRequests = (requests) => {
  localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(requests));
};

export const createAdminRequest = ({
  requesterId,
  requesterName,
  requesterEmail,
  requesterRole,
  type = "general",
  title,
  details,
}) => {
  const list = getAdminRequests();
  const newReq = {
    id: `req_${Date.now()}`,
    requesterId,
    requesterName,
    requesterEmail,
    requesterRole,
    type,
    title,
    details,
    status: "pending",
    adminNote: "",
    createdAt: new Date().toISOString(),
    reviewedAt: null,
  };

  const updated = [newReq, ...list];
  saveAdminRequests(updated);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("fittrack:request-changed", { detail: newReq }));
  }

  return newReq;
};

export const updateAdminRequestStatus = (requestId, status, adminNote = "") => {
  const list = getAdminRequests();
  let targetReq = null;

  const updated = list.map((r) => {
    if (r.id === requestId || r._id === requestId) {
      targetReq = {
        ...r,
        status,
        adminNote: adminNote || (status === "approved" ? "Approved by Admin" : "Rejected by Admin"),
        reviewedAt: new Date().toISOString(),
      };
      return targetReq;
    }
    return r;
  });

  saveAdminRequests(updated);

  // If approved and request was for membership upgrade, activate PRO tier for that user
  if (targetReq && status === "approved" && (targetReq.type === "membership_upgrade" || targetReq.type === "membership_renewal")) {
    approveMemberPayment(targetReq.requesterEmail || targetReq.requesterName);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("fittrack:request-changed", { detail: targetReq }));
  }

  return targetReq;
};

// ==========================================
// DIRECT CHAT MESSAGING HELPERS
// ==========================================

export const getChatMessagesList = () => {
  const data = localStorage.getItem(STORAGE_KEYS.MESSAGES);
  return data ? JSON.parse(data) : [];
};

export const saveChatMessagesList = (messages) => {
  localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
};

export const getConversationMessages = (user1Id, user2Id) => {
  if (!user1Id || !user2Id) return [];
  const allMessages = getChatMessagesList();
  const conversation = allMessages.filter(
    (m) =>
      (m.senderId === user1Id && m.receiverId === user2Id) ||
      (m.senderId === user2Id && m.receiverId === user1Id)
  );
  return conversation.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
};

export const sendChatMessage = ({
  senderId,
  receiverId,
  senderName,
  senderRole,
  content,
}) => {
  if (!content || !content.trim()) return null;

  const allMessages = getChatMessagesList();
  const newMsg = {
    id: `msg_${Date.now()}`,
    senderId,
    receiverId,
    senderName,
    senderRole,
    content: content.trim(),
    read: false,
    createdAt: new Date().toISOString(),
  };

  const updated = [...allMessages, newMsg];
  saveChatMessagesList(updated);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("fittrack:chat-changed", { detail: newMsg }));
  }

  return newMsg;
};

/**
 * Record a genuine real-time camera AI analysis session into member's progress history
 */
export const recordMemberAISession = (memberIdentifier, exerciseName, score) => {
  if (!memberIdentifier || score === null || score === undefined) return null;
  const scoreNum = Number(score);
  if (isNaN(scoreNum) || scoreNum <= 0) return null;

  const memberKey = (memberIdentifier || "").toLowerCase().trim();
  const members = getMembersList();
  const currentMem = members.find(
    (m) =>
      m.email?.toLowerCase() === memberKey ||
      m.name?.toLowerCase() === memberKey
  );
  const canonicalKey = (currentMem?.email || memberKey).toLowerCase().trim();
  const canonicalName = currentMem?.name || memberIdentifier;

  let allProgress = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    if (raw) allProgress = JSON.parse(raw);
  } catch (e) {}

  const memberProgress =
    allProgress[canonicalKey] ||
    (canonicalName ? allProgress[canonicalName.toLowerCase().trim()] : null) ||
    allProgress[memberKey] ||
    {};

  let history = Array.isArray(memberProgress.formHistory)
    ? memberProgress.formHistory.filter((h) => h.isRealSession && h.value !== 89)
    : [];

  const nowLabel = `${exerciseName} (${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })})`;
  history.push({
    name: nowLabel,
    exercise: exerciseName,
    value: scoreNum,
    date: new Date().toISOString(),
    isRealSession: true,
  });

  if (history.length > 10) {
    history = history.slice(history.length - 10);
  }

  const avg = Math.round(history.reduce((acc, h) => acc + h.value, 0) / history.length);

  memberProgress.formHistory = history;
  memberProgress.formScore = avg;

  allProgress[canonicalKey] = memberProgress;
  if (canonicalName) allProgress[canonicalName.toLowerCase().trim()] = memberProgress;
  allProgress[memberKey] = memberProgress;

  try {
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(allProgress));
  } catch (e) {}

  try {
    const localUser = JSON.parse(localStorage.getItem("fittrack_user") || "{}");
    if (
      (localUser.name && localUser.name.toLowerCase() === canonicalName.toLowerCase()) ||
      (localUser.email && localUser.email.toLowerCase() === canonicalKey) ||
      (localUser.name && localUser.name.toLowerCase() === memberKey) ||
      (localUser.email && localUser.email.toLowerCase() === memberKey)
    ) {
      localUser.formScore = avg;
      localUser.formHistory = history;
      localStorage.setItem("fittrack_user", JSON.stringify(localUser));
    }
  } catch (e) {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("fittrack:progress-updated", { detail: { formScore: avg, formHistory: history } }));
  }

  return { formScore: avg, formHistory: history };
};

/**
 * Save LangChain/LLM AI Form Check Set Summary to member profile and notify assigned trainer
 */
export const saveMemberAISetSummary = (memberIdentifier, setSummaryData) => {
  if (!memberIdentifier || !setSummaryData) return null;

  const memberKey = (memberIdentifier || "").toLowerCase().trim();
  const members = getMembersList();
  const currentMem = members.find(
    (m) =>
      m.email?.toLowerCase() === memberKey ||
      m.name?.toLowerCase() === memberKey
  );
  const canonicalKey = (currentMem?.email || memberKey).toLowerCase().trim();
  const canonicalName = currentMem?.name || memberIdentifier;

  let allProgress = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    if (raw) allProgress = JSON.parse(raw);
  } catch (e) {}

  const memberProgress =
    allProgress[canonicalKey] ||
    (canonicalName ? allProgress[canonicalName.toLowerCase().trim()] : null) ||
    allProgress[memberKey] ||
    {};

  const enrichedSummary = {
    ...setSummaryData,
    completedAt: new Date().toISOString(),
    memberName: canonicalName,
    athleteName: canonicalName,
  };

  memberProgress.latestAiSetSummary = enrichedSummary;

  // If score is present, update form history
  if (setSummaryData.formScore) {
    const scoreNum = Number(setSummaryData.formScore);
    let history = Array.isArray(memberProgress.formHistory)
      ? memberProgress.formHistory.filter((h) => h.isRealSession && h.value !== 89)
      : [];

    const nowLabel = `${setSummaryData.exercise || "Set"} (${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })})`;
    history.push({
      name: nowLabel,
      exercise: setSummaryData.exercise || "Exercise",
      value: scoreNum,
      reps: Number(setSummaryData.reps) || 0,
      date: new Date().toISOString(),
      isRealSession: true,
    });

    if (history.length > 10) {
      history = history.slice(history.length - 10);
    }

    const avg = Math.round(history.reduce((acc, h) => acc + h.value, 0) / history.length);
    memberProgress.formHistory = history;
    memberProgress.formScore = avg;
  }

  allProgress[canonicalKey] = memberProgress;
  if (canonicalName) allProgress[canonicalName.toLowerCase().trim()] = memberProgress;
  allProgress[memberKey] = memberProgress;

  try {
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(allProgress));
  } catch (e) {}

  // Cross-sync with localStorage fittrack_user
  try {
    const localUser = JSON.parse(localStorage.getItem("fittrack_user") || "{}");
    if (
      (localUser.name && localUser.name.toLowerCase() === canonicalName.toLowerCase()) ||
      (localUser.email && localUser.email.toLowerCase() === canonicalKey) ||
      (localUser.name && localUser.name.toLowerCase() === memberKey) ||
      (localUser.email && localUser.email.toLowerCase() === memberKey)
    ) {
      localUser.latestAiSetSummary = enrichedSummary;
      if (memberProgress.formScore) {
        localUser.formScore = memberProgress.formScore;
        localUser.formHistory = memberProgress.formHistory;
      }
      localStorage.setItem("fittrack_user", JSON.stringify(localUser));
    }
  } catch (e) {}

  // Notify trainer
  try {
    const notifsData = localStorage.getItem(STORAGE_KEYS.TRAINER_NOTIFICATIONS);
    const notifs = notifsData ? JSON.parse(notifsData) : [];
    notifs.unshift({
      id: `ai_notif_${Date.now()}`,
      type: "ai_set_summary",
      memberName: canonicalName,
      exercise: setSummaryData.exercise,
      reps: setSummaryData.reps,
      formScore: setSummaryData.formScore,
      summary: setSummaryData.summary,
      headline: setSummaryData.headline,
      timestamp: new Date().toISOString(),
      text: `🤖 AI Form Check: ${canonicalName} completed ${setSummaryData.reps} reps of ${setSummaryData.exercise} (${setSummaryData.formScore}% Form Accuracy)`,
      read: false,
    });
    localStorage.setItem(STORAGE_KEYS.TRAINER_NOTIFICATIONS, JSON.stringify(notifs.slice(0, 30)));
  } catch (e) {}

  // Also auto-dispatch chat message to assigned trainer if available
  try {
    const currentMemberObj = currentMem || JSON.parse(localStorage.getItem("fittrack_user") || "{}");
    const trainerName = currentMemberObj?.trainer || currentMemberObj?.trainerId?.name || "Assigned Trainer";
    const trainers = getTrainersList();
    const assignedTrainer = trainers.find((t) => t.name === trainerName || t.id === currentMemberObj?.trainerId);
    if (assignedTrainer) {
      sendChatMessage({
        senderId: currentMemberObj.id || canonicalKey,
        receiverId: assignedTrainer.id,
        senderName: canonicalName,
        senderRole: "member",
        content: `📊 [AI Form Check Set Summary]: ${setSummaryData.headline || `${setSummaryData.exercise} - ${setSummaryData.reps} Reps`}\n\n${setSummaryData.summary || "Set completed with AI Form Coach."}`,
      });
    }
  } catch (e) {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("fittrack:ai-set-summary-updated", { detail: enrichedSummary }));
    window.dispatchEvent(new CustomEvent("fittrack:progress-updated", { detail: memberProgress }));
    window.dispatchEvent(new CustomEvent("fittrack:workout-completed", { detail: { memberName: canonicalName } }));
  }

  return enrichedSummary;
};

/**
 * Clear member's latest AI set summary when starting a fresh set
 */
export const clearMemberAISetSummary = (memberIdentifier) => {
  if (!memberIdentifier) return;
  const memberKey = (memberIdentifier || "").toLowerCase().trim();
  const members = getMembersList();
  const currentMem = members.find(
    (m) =>
      m.email?.toLowerCase() === memberKey ||
      m.name?.toLowerCase() === memberKey
  );
  const canonicalKey = (currentMem?.email || memberKey).toLowerCase().trim();
  const canonicalName = currentMem?.name || memberIdentifier;

  let allProgress = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    if (raw) allProgress = JSON.parse(raw);
  } catch (e) {}

  if (allProgress[canonicalKey]) {
    delete allProgress[canonicalKey].latestAiSetSummary;
  }
  if (canonicalName && allProgress[canonicalName.toLowerCase().trim()]) {
    delete allProgress[canonicalName.toLowerCase().trim()].latestAiSetSummary;
  }
  if (allProgress[memberKey]) {
    delete allProgress[memberKey].latestAiSetSummary;
  }

  try {
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(allProgress));
  } catch (e) {}

  try {
    const localUser = JSON.parse(localStorage.getItem("fittrack_user") || "{}");
    if (
      (localUser.name && localUser.name.toLowerCase() === canonicalName.toLowerCase()) ||
      (localUser.email && localUser.email.toLowerCase() === canonicalKey)
    ) {
      delete localUser.latestAiSetSummary;
      localStorage.setItem("fittrack_user", JSON.stringify(localUser));
    }
  } catch (e) {}

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("fittrack:ai-set-summary-cleared", { detail: { memberName: canonicalName } }));
  }
};

/**
 * Retrieve the member's current active AI set summary (persists until new set is performed)
 */
export const getMemberLatestAISetSummary = (memberIdentifier) => {
  if (!memberIdentifier) return null;
  const memberKey = (memberIdentifier || "").toLowerCase().trim();
  const members = getMembersList();
  const currentMem = members.find(
    (m) =>
      m.email?.toLowerCase() === memberKey ||
      m.name?.toLowerCase() === memberKey
  );
  const canonicalKey = (currentMem?.email || memberKey).toLowerCase().trim();
  const canonicalName = currentMem?.name || memberIdentifier;

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    if (raw) {
      const allProgress = JSON.parse(raw);
      const prog =
        allProgress[canonicalKey] ||
        (canonicalName ? allProgress[canonicalName.toLowerCase().trim()] : null) ||
        allProgress[memberKey];
      if (prog?.latestAiSetSummary) return prog.latestAiSetSummary;
    }
  } catch (e) {}

  try {
    const localUser = JSON.parse(localStorage.getItem("fittrack_user") || "{}");
    if (localUser?.latestAiSetSummary) return localUser.latestAiSetSummary;
  } catch (e) {}

  return null;
};



