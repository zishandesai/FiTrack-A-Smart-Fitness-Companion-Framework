import { createClient } from "@supabase/supabase-js";

const DEFAULT_CERTIFIED_TRAINERS = [
  {
    id: "tr_marcus",
    _id: "tr_marcus",
    name: "Marcus Vance",
    email: "marcus.coach@fittrack.com",
    phone: "+1 (555) 234-5678",
    specialty: "Strength & Hypertrophy",
    experience: "7+ years",
    rating: 4.9,
    clients: 12,
    status: "Active",
    bio: "Former collegiate powerlifting coach specializing in progressive overload, biomechanics, and aesthetic hypertrophy splits.",
  },
  {
    id: "tr_elena",
    _id: "tr_elena",
    name: "Elena Rostova",
    email: "elena.coach@fittrack.com",
    phone: "+1 (555) 345-6789",
    specialty: "Functional Movement & Mobility",
    experience: "5+ years",
    rating: 5.0,
    clients: 9,
    status: "Active",
    bio: "NASM-CPT specialist dedicated to injury prevention, athletic mobility, core stability, and dynamic HIIT conditioning.",
  },
  {
    id: "tr_zishan",
    _id: "tr_zishan",
    name: "Zishan Khan",
    email: "zishan.coach@fittrack.com",
    phone: "+1 (555) 456-7890",
    specialty: "Powerlifting & Athletic Conditioning",
    experience: "6+ years",
    rating: 4.9,
    clients: 15,
    status: "Active",
    bio: "CSCS certified trainer focused on squat/bench/deadlift optimization, speed mechanics, and peak power output.",
  },
  {
    id: "tr_tyler",
    _id: "tr_tyler",
    name: "Tyler Brooks",
    email: "tyler.coach@fittrack.com",
    phone: "+1 (555) 567-8901",
    specialty: "Cardio Endurance & Weight Loss",
    experience: "4+ years",
    rating: 4.8,
    clients: 8,
    status: "Active",
    bio: "ACSM-EP endurance coach specialized in metabolic conditioning, body recomposition, and progressive cardio programming.",
  },
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://dydznokssaipevedyyjx.supabase.co";
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5ZHpub2tzc2FpcGV2ZWR5eWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNTIyMTcsImV4cCI6MjEwNTkyODIxN30.-tonzFNAJLVFxuMI4IdHeZBuB6l_sdz4h2aeE5K24Yc";

  let cloudTrainers = [];
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "trainer")
      .order("created_at", { ascending: false });

    if (Array.isArray(data)) {
      cloudTrainers = data.map((t) => ({
        ...t,
        id: t.id,
        _id: t.id,
        name: t.name || (t.email ? t.email.split("@")[0] : "Coach"),
        email: t.email,
        phone: t.phone || "—",
        specialty: t.specialty || "Strength & Hypertrophy",
        experience: t.experience || "5+ years",
        rating: t.rating || 5.0,
        clients: 0,
        status: "Active",
        bio: t.bio || "Certified coach.",
      }));
    }
  } catch (err) {
    console.warn("Supabase serverless trainers error:", err.message);
  }

  const trMap = new Map();
  DEFAULT_CERTIFIED_TRAINERS.forEach((t) => trMap.set(t.id, t));
  cloudTrainers.forEach((t) => trMap.set(t.id, { ...(trMap.get(t.id) || {}), ...t }));

  return res.status(200).json({
    success: true,
    trainers: Array.from(trMap.values()),
  });
}
