import { createClient } from "@supabase/supabase-js";

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

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const {
    email,
    password,
    name,
    role = "member",
    phone = "",
    age = null,
    gender = "",
    height = null,
    weight = null,
    targetWeight = null,
    specialty = "",
    experience = "",
    goal = "Build Muscle",
  } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required" });
  }

  const normEmail = email.trim().toLowerCase();
  const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://dydznokssaipevedyyjx.supabase.co";
  const supabaseKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5ZHpub2tzc2FpcGV2ZWR5eWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNTIyMTcsImV4cCI6MjEwNTkyODIxN30.-tonzFNAJLVFxuMI4IdHeZBuB6l_sdz4h2aeE5K24Yc";
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const metaData = {
      name: name || normEmail.split("@")[0],
      role: role || "member",
      phone: phone || null,
      age: age ? Number(age) : null,
      gender: gender || null,
      height: height ? Number(height) : null,
      weight: weight ? Number(weight) : null,
      target_weight: targetWeight ? Number(targetWeight) : null,
      specialty: specialty || null,
      goal: goal || "Build Muscle",
    };

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: normEmail,
      password,
      options: {
        data: metaData,
      },
    });

    if (authError) {
      if (authError.message?.toLowerCase().includes("already registered") || authError.status === 422) {
        return res.status(400).json({
          success: false,
          message: "An account with this email address already exists. Please log in.",
        });
      }
      return res.status(400).json({ success: false, message: authError.message });
    }

    const user = authData?.user;
    if (!user) {
      return res.status(400).json({ success: false, message: "Failed to create user account." });
    }

    const profilePayload = {
      id: user.id,
      email: normEmail,
      ...metaData,
      created_at: new Date().toISOString(),
    };

    let profile = null;
    try {
      const { data: profData } = await supabase
        .from("profiles")
        .upsert(profilePayload)
        .select()
        .maybeSingle();
      profile = profData;
    } catch {}

    // Auto-create active membership for members
    if (user.id && (role === "member" || !role)) {
      try {
        await supabase.from("memberships").insert({
          user_id: user.id,
          plan: "PRO",
          duration: "1 Year",
          price: 199,
          payment_method: "online",
          status: "active",
          start_date: new Date().toISOString(),
        });
      } catch {}
    }

    return res.status(200).json({
      success: true,
      user: {
        ...user,
        ...profilePayload,
        ...(profile || {}),
      },
      token: authData.session?.access_token || `token_${user.id}_${Date.now()}`,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "An unexpected error occurred during signup.",
    });
  }
}
