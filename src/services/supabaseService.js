import { supabase, isSupabaseConfigured } from "../lib/supabase";

/**
 * ============================================================================
 * SUPABASE SERVICE LAYER FOR FIT-TRACK
 * Full cloud PostgreSQL database and auth integration with graceful fallback
 * ============================================================================
 */

export const supabaseService = {
  isConfigured: () => isSupabaseConfigured(),

  // --------------------------------------------------------------------------
  // AUTH & PROFILES
  // --------------------------------------------------------------------------
  async signUp({ email, password, name, role = "member", phone = "", age = null, gender = "", height = null, weight = null, targetWeight = null, specialty = "" }) {
    if (!isSupabaseConfigured()) throw new Error("Supabase is not configured yet.");

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
        },
      },
    });

    if (authError) throw authError;

    const user = authData.user;
    if (!user) throw new Error("Signup failed: No user returned");

    // Upsert profile into public.profiles
    const profilePayload = {
      id: user.id,
      email,
      name,
      role,
      phone: phone || null,
      age: age ? Number(age) : null,
      gender: gender || null,
      height: height ? Number(height) : null,
      weight: weight ? Number(weight) : null,
      target_weight: targetWeight ? Number(targetWeight) : null,
      specialty: specialty || null,
      created_at: new Date().toISOString(),
    };

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .upsert(profilePayload)
      .select()
      .single();

    if (profileError) {
      console.error("Profile upsert error:", profileError);
    }

    return {
      user: {
        ...user,
        ...profilePayload,
        ...(profile || {}),
      },
      session: authData.session,
    };
  },

  async signIn({ email, password }) {
    if (!isSupabaseConfigured()) throw new Error("Supabase is not configured yet.");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Fetch user profile from public.profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("*, trainer:trainer_id(id, name, specialty)")
      .eq("id", data.user.id)
      .single();

    return {
      session: data.session,
      user: {
        ...data.user,
        ...(profile || {}),
        trainerName: profile?.trainer?.name || null,
        trainerSpecialty: profile?.trainer?.specialty || null,
      },
    };
  },

  async signOut() {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.auth.signOut();
    if (error) console.warn("Supabase signOut error:", error);
  },

  async getCurrentProfile(userId) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select("*, trainer:trainer_id(id, name, specialty)")
      .eq("id", userId)
      .single();

    if (error) return null;
    return {
      ...data,
      trainerName: data?.trainer?.name || null,
      trainerSpecialty: data?.trainer?.specialty || null,
    };
  },

  async updateProfile(userId, updates) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // --------------------------------------------------------------------------
  // MEMBERSHIPS & REQUESTS
  // --------------------------------------------------------------------------
  async getMembership(userId) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from("memberships")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return null;
    return data;
  },

  async createMembershipRequest({ userId, plan, duration, price, paymentMethod = "online", startDate = null, endDate = null }) {
    if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");

    const payload = {
      user_id: userId,
      plan,
      duration,
      price,
      payment_method: paymentMethod,
      status: paymentMethod === "cash" ? "pending" : "active",
      start_date: startDate || new Date().toISOString(),
      end_date: endDate || null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("memberships")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getAllMembershipRequests() {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from("memberships")
      .select("*, user:user_id(id, name, email, phone)")
      .order("created_at", { ascending: false });

    if (error) return [];
    return data;
  },

  async updateMembershipStatus(membershipId, status) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from("memberships")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", membershipId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // --------------------------------------------------------------------------
  // WORKOUTS & ASSIGNMENTS
  // --------------------------------------------------------------------------
  async getMemberWorkouts(memberId) {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from("workouts")
      .select("*, exercises:workout_exercises(*), trainer:trainer_id(id, name)")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false });

    if (error) return [];
    return data;
  },

  async assignWorkout({ memberId, trainerId, title, notes = "", exercises = [] }) {
    if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");

    // 1. Create Workout Header
    const { data: workout, error: workoutError } = await supabase
      .from("workouts")
      .insert({
        member_id: memberId,
        trainer_id: trainerId,
        title,
        notes,
        status: "pending",
        assigned_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (workoutError) throw workoutError;

    // 2. Insert exercises
    if (exercises && exercises.length > 0) {
      const exerciseRows = exercises.map((ex, idx) => ({
        workout_id: workout.id,
        name: ex.name,
        sets: Number(ex.sets) || 3,
        reps: Number(ex.reps) || 12,
        weight_target: ex.weight || ex.weight_target || "Bodyweight",
        rest_seconds: Number(ex.rest) || 60,
        order_index: idx,
        completed: false,
      }));

      const { error: exError } = await supabase
        .from("workout_exercises")
        .insert(exerciseRows);

      if (exError) throw exError;
    }

    return workout;
  },

  async completeExercise(exerciseId, { completedReps, completedWeight, formScore = null }) {
    if (!isSupabaseConfigured()) return { success: true };
    const { data, error } = await supabase
      .from("workout_exercises")
      .update({
        completed: true,
        completed_reps: completedReps,
        completed_weight: completedWeight,
        form_score: formScore,
        completed_at: new Date().toISOString(),
      })
      .eq("id", exerciseId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // --------------------------------------------------------------------------
  // ATTENDANCE & TURNSTILE
  // --------------------------------------------------------------------------
  async recordAttendance({ userId, method = "turnstile_qr", status = "present" }) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from("attendance")
      .insert({
        user_id: userId,
        method,
        status,
        check_in_time: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getAttendanceHistory(userId) {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .order("check_in_time", { ascending: false });

    if (error) return [];
    return data;
  },

  async getTodayAttendanceLogs() {
    if (!isSupabaseConfigured()) return [];
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("attendance")
      .select("*, user:user_id(id, name, email, role)")
      .gte("check_in_time", startOfToday.toISOString())
      .order("check_in_time", { ascending: false });

    if (error) return [];
    return data;
  },

  // --------------------------------------------------------------------------
  // AI FORM COACH TELEMETRY LOGS
  // --------------------------------------------------------------------------
  async saveFormCoachSession({ userId, exerciseType, repCount, avgFormScore, flaws = [], sessionDurationSec = 0 }) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from("form_coach_sessions")
      .insert({
        user_id: userId,
        exercise_type: exerciseType,
        rep_count: repCount,
        avg_form_score: avgFormScore,
        flaws_detected: flaws,
        session_duration_sec: sessionDurationSec,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) console.warn("Failed to log form coach session:", error);
    return data;
  },

  async getFormCoachHistory(userId) {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from("form_coach_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) return [];
    return data;
  },

  // --------------------------------------------------------------------------
  // CHAT & MESSAGING
  // --------------------------------------------------------------------------
  async sendMessage({ senderId, receiverId, content, senderRole }) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from("messages")
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        sender_role: senderRole,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getMessagesBetween(user1Id, user2Id) {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${user1Id},receiver_id.eq.${user2Id}),and(sender_id.eq.${user2Id},receiver_id.eq.${user1Id})`)
      .order("created_at", { ascending: true });

    if (error) return [];
    return data;
  },

  // --------------------------------------------------------------------------
  // DIRECTORY: MEMBERS & TRAINERS
  // --------------------------------------------------------------------------
  async getAllMembers() {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from("profiles")
      .select("*, trainer:trainer_id(id, name, specialty), memberships(*)")
      .eq("role", "member")
      .order("created_at", { ascending: false });

    if (error) return [];
    return data.map((m) => ({
      ...m,
      trainerName: m.trainer?.name || null,
      trainerSpecialty: m.trainer?.specialty || null,
      membership: m.memberships?.[0] || null,
    }));
  },

  async getAllTrainers() {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase
      .from("profiles")
      .select("*, assigned_members:profiles!profiles_trainer_id_fkey(id, name, email)")
      .eq("role", "trainer")
      .order("created_at", { ascending: false });

    if (error) return [];
    return data.map((t) => ({
      ...t,
      clientsCount: t.assigned_members?.length || 0,
    }));
  },

  async assignTrainer(memberId, trainerId) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from("profiles")
      .update({ trainer_id: trainerId })
      .eq("id", memberId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

export default supabaseService;
