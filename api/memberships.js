import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST,PUT");
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
    const { data } = await supabase
      .from("memberships")
      .select("*, user:user_id(id, name, email, phone)")
      .order("created_at", { ascending: false });

    const requests = Array.isArray(data)
      ? data.map((r) => ({
          id: r.id,
          memberName: r.user?.name || (r.user?.email ? r.user.email.split("@")[0] : "Member"),
          memberEmail: r.user?.email,
          plan: r.plan,
          duration: r.duration,
          price: r.price,
          paymentMethod: r.payment_method,
          status: r.status,
          date: r.created_at ? new Date(r.created_at).toISOString().split("T")[0] : "",
        }))
      : [];

    return res.status(200).json({
      success: true,
      memberships: requests,
      requests,
    });
  } catch (err) {
    return res.status(200).json({
      success: true,
      memberships: [],
      requests: [],
    });
  }
}
