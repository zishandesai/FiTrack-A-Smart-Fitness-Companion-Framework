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

  const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://dydznokssaipevedyyjx.supabase.co";
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5ZHpub2tzc2FpcGV2ZWR5eWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNTIyMTcsImV4cCI6MjEwNTkyODIxN30.-tonzFNAJLVFxuMI4IdHeZBuB6l_sdz4h2aeE5K24Yc";
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data: members } = await supabase
      .from("profiles")
      .select("*, memberships(*)")
      .eq("role", "member")
      .is("trainer_id", null);

    const list = Array.isArray(members)
      ? members.map((m) => {
          const membership = Array.isArray(m.memberships) ? m.memberships[0] : null;
          return {
            ...m,
            id: m.id,
            _id: m.id,
            plan: membership?.plan || "PRO",
            membershipStatus: membership?.status || "active",
          };
        })
      : [];

    return res.status(200).json({
      success: true,
      members: list,
    });
  } catch (err) {
    return res.status(200).json({
      success: true,
      members: [],
    });
  }
}
