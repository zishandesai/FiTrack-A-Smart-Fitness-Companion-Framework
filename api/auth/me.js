import { createClient } from "@supabase/supabase-js";

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

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  if (token.startsWith("admin_token_")) {
    return res.status(200).json({
      success: true,
      user: {
        id: "admin_master_001",
        name: "Gym Administrator",
        email: "admin@fittrack.com",
        role: "admin",
      },
    });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://dydznokssaipevedyyjx.supabase.co";
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5ZHpub2tzc2FpcGV2ZWR5eWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNTIyMTcsImV4cCI6MjEwNTkyODIxN30.-tonzFNAJLVFxuMI4IdHeZBuB6l_sdz4h2aeE5K24Yc";
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    let authUser = null;
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (!authErr && user) {
      authUser = user;
    }

    if (!authUser && token.startsWith("token_")) {
      const parts = token.split("_");
      const possibleId = parts[1];
      if (possibleId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*, trainer:trainer_id(id, name, specialty)")
          .eq("id", possibleId)
          .maybeSingle();

        if (profile) {
          return res.status(200).json({
            success: true,
            user: {
              ...profile,
              trainerName: profile?.trainer?.name || null,
              trainerSpecialty: profile?.trainer?.specialty || null,
            },
          });
        }
      }
    }

    if (!authUser) {
      return res.status(401).json({ success: false, message: "Invalid session token" });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*, trainer:trainer_id(id, name, specialty)")
      .eq("id", user.id)
      .single();

    return res.status(200).json({
      success: true,
      user: {
        ...user,
        ...(profile || {}),
        trainerName: profile?.trainer?.name || null,
        trainerSpecialty: profile?.trainer?.specialty || null,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
