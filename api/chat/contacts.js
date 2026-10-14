import { createClient } from "@supabase/supabase-js";

const DEFAULT_COACHES = [
  { id: "tr_marcus", _id: "tr_marcus", name: "Marcus Vance", email: "marcus.coach@fittrack.com", specialty: "Strength & Hypertrophy", role: "trainer" },
  { id: "tr_elena", _id: "tr_elena", name: "Elena Rostova", email: "elena.coach@fittrack.com", specialty: "Functional Movement & Mobility", role: "trainer" },
  { id: "tr_zishan", _id: "tr_zishan", name: "Zishan Khan", email: "zishan.coach@fittrack.com", specialty: "Powerlifting & Athletic Conditioning", role: "trainer" },
  { id: "tr_tyler", _id: "tr_tyler", name: "Tyler Brooks", email: "tyler.coach@fittrack.com", specialty: "Cardio Endurance & Weight Loss", role: "trainer" },
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
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
    const { data: members } = await supabase
      .from("profiles")
      .select("id, name, email, role, trainer_id")
      .eq("role", "member");

    const { data: trainers } = await supabase
      .from("profiles")
      .select("id, name, email, role, specialty")
      .eq("role", "trainer");

    const cloudTrainers = Array.isArray(trainers) ? trainers : [];
    const trMap = new Map();
    DEFAULT_COACHES.forEach((c) => trMap.set(c.id, c));
    cloudTrainers.forEach((c) => trMap.set(c.id, c));

    const contacts = [
      ...Array.from(trMap.values()),
      ...(Array.isArray(members) ? members : []),
    ];

    return res.status(200).json({
      success: true,
      contacts,
    });
  } catch (err) {
    return res.status(200).json({
      success: true,
      contacts: DEFAULT_COACHES,
    });
  }
}
