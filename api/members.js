import { createClient } from "@supabase/supabase-js";

const DEFAULT_COACHES = [
  { id: "tr_marcus", name: "Marcus Vance", specialty: "Strength & Hypertrophy" },
  { id: "tr_elena", name: "Elena Rostova", specialty: "Functional Movement & Mobility" },
  { id: "tr_zishan", name: "Zishan Khan", specialty: "Powerlifting & Athletic Conditioning" },
  { id: "tr_tyler", name: "Tyler Brooks", specialty: "Cardio Endurance & Weight Loss" },
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST,PUT,DELETE");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://dydznokssaipevedyyjx.supabase.co";
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5ZHpub2tzc2FpcGV2ZWR5eWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNTIyMTcsImV4cCI6MjEwNTkyODIxN30.-tonzFNAJLVFxuMI4IdHeZBuB6l_sdz4h2aeE5K24Yc";
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*, trainer:trainer_id(id, name, specialty), memberships(*)")
      .eq("role", "member")
      .order("created_at", { ascending: false });

    let list = data;
    if (error || !Array.isArray(list)) {
      const { data: fallback } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "member")
        .order("created_at", { ascending: false });
      list = fallback || [];
    }

    const members = list.map((m) => {
      const membership = Array.isArray(m.memberships) ? m.memberships[0] : (m.membership || null);
      let resolvedTrainer = m.trainer?.name || m.trainerName;
      let resolvedSpecialty = m.trainer?.specialty || m.trainerSpecialty;

      if (!resolvedTrainer && m.trainer_id) {
        const found = DEFAULT_COACHES.find(
          (c) => c.id === m.trainer_id || c.name.toLowerCase() === String(m.trainer_id).toLowerCase()
        );
        if (found) {
          resolvedTrainer = found.name;
          resolvedSpecialty = found.specialty;
        } else {
          resolvedTrainer = "Assigned Coach";
        }
      }
      if (!resolvedTrainer) resolvedTrainer = "—";

      return {
        ...m,
        id: m.id,
        _id: m.id,
        name: m.name || (m.email ? m.email.split("@")[0] : "Member"),
        email: m.email,
        phone: m.phone || "—",
        role: "member",
        plan: membership?.plan || m.plan || "PRO",
        membershipStatus: membership?.status || m.membershipStatus || "active",
        trainer: resolvedTrainer,
        trainerName: resolvedTrainer !== "—" ? resolvedTrainer : null,
        trainerSpecialty: resolvedSpecialty || null,
        trainerId: m.trainer_id || null,
        goal: m.goal || "Build Muscle",
        weight: m.weight || 70,
        targetWeight: m.target_weight || null,
        height: m.height || null,
        joinedDate: m.created_at ? new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recent",
        progress: m.progress || 0,
        attendance: m.attendance || 0,
        workoutsCount: m.workoutsCount || 0,
        formScore: m.formScore || 0,
      };
    });

    return res.status(200).json({
      success: true,
      members,
    });
  } catch (err) {
    return res.status(200).json({
      success: true,
      members: [],
    });
  }
}
