import { createContext, useContext, useEffect, useState } from "react";
import { getMembersList, saveMembersList, getMemberProgressMetrics } from "../services/mockData";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUserData = async () => {
    try {
      const savedUser = localStorage.getItem("fittrack_user");
      let parsed = null;
      if (savedUser) {
        parsed = JSON.parse(savedUser);
        setUser(parsed);
      }
      const token = localStorage.getItem("fittrack_token");
      if (token) {
        const api = (await import("../services/api")).default;
        const res = await api.get("/auth/me");
        if (res.data?.success && res.data?.user) {
          const metrics = getMemberProgressMetrics(
            parsed?.name || parsed?.email || res.data.user.name || res.data.user.email,
            { ...res.data.user, ...parsed }
          );

          const hasRealSessions = Array.isArray(metrics?.formHistory) && metrics.formHistory.length > 0;
          const freshUser = {
            ...res.data.user,
            attendance: metrics?.attendance ?? parsed?.attendance ?? res.data.user.attendance ?? 0,
            workoutsCount: metrics?.workoutsCount ?? parsed?.workoutsCount ?? res.data.user.workoutsCount ?? 0,
            formScore: hasRealSessions ? metrics.formScore : null,
            weeklyWorkouts: metrics?.weeklyWorkouts ?? parsed?.weeklyWorkouts ?? null,
            formHistory: metrics?.formHistory ?? parsed?.formHistory ?? [],
            weightHistory: metrics?.weightHistory ?? parsed?.weightHistory ?? [{ name: "Current", value: Number(res.data.user.weight) || 60 }],
            targetWeight: metrics?.targetWeight ?? parsed?.targetWeight ?? res.data.user.targetWeight ?? null,
            trainer: parsed?.trainerName || res.data.user.trainerName || res.data.user.trainer || null,
            trainerName: parsed?.trainerName || res.data.user.trainerName || res.data.user.trainer || null,
            trainerSpecialty: parsed?.trainerSpecialty || res.data.user.trainerSpecialty || null,
          };
          setUser(freshUser);
          localStorage.setItem("fittrack_user", JSON.stringify(freshUser));
        }
      }
    } catch {
      // Local fallback
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("fittrack_user");

    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        // Sync trainer from members list if present
        const members = getMembersList();
        const currentMem = members.find(
          (m) => m.email === parsed.email || m.name === parsed.name
        );
        if (currentMem?.trainerName) {
          parsed.trainerName = currentMem.trainerName;
          parsed.trainer = currentMem.trainerName;
          parsed.trainerSpecialty = currentMem.trainerSpecialty || "Fitness Coach";
          parsed.trainerId = currentMem.trainerId;
        }

        // Sanitize any lingering legacy dummy arrays
        if (Array.isArray(parsed.weightHistory)) {
          if (parsed.weightHistory.some((h) => h.name?.includes("Wks Ago") || h.name?.includes("Last Wk"))) {
            parsed.weightHistory = parsed.weight ? [{ name: "Current", value: Number(parsed.weight) }] : [];
          }
        }
        if (Array.isArray(parsed.formHistory)) {
          parsed.formHistory = parsed.formHistory.filter(
            (h) => h && h.isRealSession && h.value !== 89 && h.name !== "Today"
          );
        } else {
          parsed.formHistory = [];
        }
        if (!parsed.formHistory || parsed.formHistory.length === 0) {
          parsed.formHistory = [];
          parsed.formScore = null;
        }
        if (parsed.formScore === 89 || parsed.formScore === 92 || parsed.formScore === 85) {
          parsed.formScore = null;
        }
        if (parsed.attendance === 75) {
          parsed.attendance = 0;
        }

        // Merge live progress metrics
        const metrics = getMemberProgressMetrics(parsed.name || parsed.email, parsed);
        if (metrics) {
          parsed.workoutsCount = metrics.workoutsCount;
          parsed.attendance = metrics.attendance;
          parsed.formScore = metrics.formScore;
          parsed.weeklyWorkouts = metrics.weeklyWorkouts;
          parsed.formHistory = metrics.formHistory;
          parsed.weightHistory = metrics.weightHistory;
          parsed.targetWeight = metrics.targetWeight;
        }

        localStorage.setItem("fittrack_user", JSON.stringify(parsed));
        setUser(parsed);
        // Sync with backend asynchronously
        refreshUserData();
      } catch {
        localStorage.removeItem("fittrack_user");
      }
    }
    setLoading(false);

    const handleSync = () => {
      try {
        const saved = localStorage.getItem("fittrack_user");
        if (saved) {
          const parsed = JSON.parse(saved);
          const members = getMembersList();
          const currentMem = members.find(
            (m) => m.email === parsed.email || m.name === parsed.name
          );
          if (currentMem?.trainerName) {
            parsed.trainerName = currentMem.trainerName;
            parsed.trainer = currentMem.trainerName;
            parsed.trainerSpecialty = currentMem.trainerSpecialty || "Fitness Coach";
            parsed.trainerId = currentMem.trainerId;
          }

          const metrics = getMemberProgressMetrics(parsed.name || parsed.email, parsed);
          if (metrics) {
            parsed.workoutsCount = metrics.workoutsCount;
            parsed.attendance = metrics.attendance;
            parsed.formScore = metrics.formScore;
            parsed.weeklyWorkouts = metrics.weeklyWorkouts;
            parsed.formHistory = metrics.formHistory;
            parsed.weightHistory = metrics.weightHistory;
            parsed.targetWeight = metrics.targetWeight;
          }

          localStorage.setItem("fittrack_user", JSON.stringify(parsed));
          setUser({ ...parsed });
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener("fittrack:assignment-changed", handleSync);
    window.addEventListener("fittrack:membership-changed", handleSync);
    window.addEventListener("fittrack:workout-completed", handleSync);
    window.addEventListener("fittrack:workout-changed", handleSync);
    window.addEventListener("fittrack:progress-updated", handleSync);
    window.addEventListener("fittrack:attendance-changed", handleSync);
    window.addEventListener("storage", handleSync);

    return () => {
      window.removeEventListener("fittrack:assignment-changed", handleSync);
      window.removeEventListener("fittrack:membership-changed", handleSync);
      window.removeEventListener("fittrack:workout-completed", handleSync);
      window.removeEventListener("fittrack:workout-changed", handleSync);
      window.removeEventListener("fittrack:progress-updated", handleSync);
      window.removeEventListener("fittrack:attendance-changed", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const login = async (email, password) => {
    if (!email || !password) {
      throw new Error("Please enter both email and password.");
    }

    try {
      const { loginUser } = await import("../services/authService");
      const data = await loginUser({ email: email.trim().toLowerCase(), password });

      if (data.success && data.token && data.user) {
        localStorage.setItem("fittrack_token", data.token);

        let resolvedTrainer = data.user.trainerName || data.user.trainer || null;
        let resolvedSpecialty = data.user.trainerSpecialty || null;
        let resolvedTrainerId = data.user.trainerId || null;

        if (!resolvedTrainer) {
          const members = getMembersList();
          const currentMem = members.find((m) => m.email === data.user.email || m.name === data.user.name);
          if (currentMem?.trainerName) {
            resolvedTrainer = currentMem.trainerName;
            resolvedSpecialty = currentMem.trainerSpecialty || "Fitness Coach";
            resolvedTrainerId = currentMem.trainerId;
          }
        }

        const metrics = getMemberProgressMetrics(data.user.name || data.user.email, data.user);

          const hasRealSessions = Array.isArray(metrics?.formHistory) && metrics.formHistory.length > 0;
          const backendUser = {
          ...data.user,
          attendance: metrics?.attendance ?? data.user.attendance ?? 0,
          workoutsCount: metrics?.workoutsCount ?? data.user.workoutsCount ?? 0,
          formScore: hasRealSessions ? metrics.formScore : null,
          weeklyWorkouts: metrics?.weeklyWorkouts ?? null,
          formHistory: metrics?.formHistory ?? [],
          weightHistory: metrics?.weightHistory ?? (data.user.weight ? [{ name: "Current", value: Number(data.user.weight) }] : []),
          targetWeight: metrics?.targetWeight ?? data.user.targetWeight ?? null,
          trainer: resolvedTrainer,
          trainerName: resolvedTrainer,
          trainerSpecialty: resolvedSpecialty,
          trainerId: resolvedTrainerId,
        };
        setUser(backendUser);
        localStorage.setItem("fittrack_user", JSON.stringify(backendUser));

        // Ensure member is saved in the members roster so Admin always sees them
        if (backendUser.role === "member") {
          try {
            const members = getMembersList();
            const existingIdx = members.findIndex(
              (m) =>
                m.email?.toLowerCase() === backendUser.email?.toLowerCase() ||
                (backendUser.id && (m.id === backendUser.id || m._id === backendUser.id))
            );
            const memRecord = {
              id: backendUser.id || backendUser._id || `mem_${Date.now()}`,
              _id: backendUser.id || backendUser._id,
              name: backendUser.name || (backendUser.email ? backendUser.email.split("@")[0] : "Member"),
              email: backendUser.email,
              phone: backendUser.phone || "—",
              role: "member",
              plan: backendUser.plan || "PRO",
              membershipStatus: backendUser.membershipStatus || "active",
              trainer: backendUser.trainer || resolvedTrainer || "—",
              trainerName: backendUser.trainerName || resolvedTrainer || null,
              trainerSpecialty: backendUser.trainerSpecialty || resolvedSpecialty || null,
              trainerId: backendUser.trainerId || resolvedTrainerId || null,
              goal: backendUser.goal || "Build Muscle",
              weight: backendUser.weight || 70,
              targetWeight: backendUser.targetWeight || null,
              height: backendUser.height || null,
              joinedDate:
                backendUser.joinedDate ||
                new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              progress: backendUser.progress || 0,
              attendance: backendUser.attendance || 0,
              workoutsCount: backendUser.workoutsCount || 0,
              formScore: backendUser.formScore || 0,
            };
            if (existingIdx >= 0) {
              members[existingIdx] = { ...members[existingIdx], ...memRecord };
              saveMembersList([...members]);
            } else {
              saveMembersList([memRecord, ...members]);
            }
          } catch {
            // ignore
          }
        }

        return backendUser;
      } else {
        throw new Error(data.message || "Login failed. Please verify your credentials.");
      }
    } catch (err) {
      const errorMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Invalid email or password. Please try again.";
      throw new Error(errorMsg);
    }
  };

  const signup = async (userData) => {
    try {
      const { signupUser } = await import("../services/authService");
      const data = await signupUser({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        phone: userData.phone,
        role: userData.role || "member",
        specialty: userData.specialty,
        experience: userData.experience,
        age: userData.age,
        height: userData.height,
        weight: userData.weight,
        goal: userData.goal,
      });

      if (data.success && data.token && data.user) {
        localStorage.setItem("fittrack_token", data.token);
        const resolvedRole = data.user.role || userData.role || "member";
        const backendUser = {
          ...data.user,
          role: resolvedRole,
          specialty: data.user.specialty || userData.specialty || "Strength & Hypertrophy",
          experience: data.user.experience || userData.experience || "3+ years",
          membership: null,
          membershipStatus: "active",
          plan: "PRO",
          progress: 0,
          attendance: 0,
          workoutsCount: 0,
          formScore: 0,
        };
        setUser(backendUser);
        localStorage.setItem("fittrack_user", JSON.stringify(backendUser));

        // Ensure newly registered member is immediately in the admin roster
        if (resolvedRole === "member") {
          try {
            const members = getMembersList();
            if (!members.some((m) => m.email?.toLowerCase() === backendUser.email?.toLowerCase())) {
              const newMem = {
                id: backendUser.id || backendUser._id || `mem_${Date.now()}`,
                _id: backendUser.id || backendUser._id,
                name: backendUser.name || (backendUser.email ? backendUser.email.split("@")[0] : "Member"),
                email: backendUser.email,
                phone: backendUser.phone || "—",
                role: "member",
                plan: "PRO",
                membershipStatus: "active",
                trainer: "—",
                trainerName: null,
                trainerSpecialty: null,
                trainerId: null,
                goal: backendUser.goal || "Build Muscle",
                weight: backendUser.weight || 70,
                targetWeight: backendUser.targetWeight || null,
                height: backendUser.height || null,
                joinedDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                progress: 0,
                attendance: 0,
                workoutsCount: 0,
                formScore: 0,
              };
              saveMembersList([newMem, ...members]);
            }
          } catch {
            // ignore
          }
        } else if (resolvedRole === "trainer") {
          try {
            const trainers = getTrainersList();
            if (!trainers.some((t) => t.email?.toLowerCase() === backendUser.email?.toLowerCase())) {
              const newTr = {
                id: backendUser.id || backendUser._id || `tr_${Date.now()}`,
                _id: backendUser.id || backendUser._id,
                name: backendUser.name || (backendUser.email ? backendUser.email.split("@")[0] : "Trainer"),
                email: backendUser.email,
                phone: backendUser.phone || "—",
                specialty: backendUser.specialty || "Strength & Hypertrophy",
                experience: backendUser.experience || "3+ years",
                rating: 5.0,
                clients: 0,
                status: "Active",
                bio: `Certified fitness coach specializing in ${backendUser.specialty || "progressive overload and strength"}.`,
              };
              saveTrainersList([newTr, ...trainers]);
            }
          } catch {
            // ignore
          }
        }

        return backendUser;
      } else {
        throw new Error(data.message || "Registration failed.");
      }
    } catch (err) {
      const errorMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to complete registration. Please try again.";
      throw new Error(errorMsg);
    }
  };

  const logout = async () => {
    try {
      const { isSupabaseConfigured } = await import("../lib/supabase");
      const { default: supabaseService } = await import("../services/supabaseService");
      if (isSupabaseConfigured()) {
        await supabaseService.signOut();
      }
    } catch {
      // ignore
    }
    setUser(null);
    localStorage.removeItem("fittrack_user");
    localStorage.removeItem("fittrack_token");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}