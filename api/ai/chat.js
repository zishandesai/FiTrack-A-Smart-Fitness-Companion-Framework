/**
 * Vercel Serverless Function: /api/ai/chat
 * Secure, production-grade backend endpoint for Gemini 3.8 Flash AI
 * Keeps GEMINI_API_KEY 100% server-side and private
 */

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
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

  try {
    const { message = "", history = [], clientContext = {}, imageBase64 = null } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim() === "") {
      return res.status(500).json({
        success: false,
        message: "GEMINI_API_KEY is not configured in server environment variables.",
      });
    }

    const SYSTEM_INSTRUCTION = `You are "FIT-TRACK NutriCoach", an elite AI Sports Scientist, Exercise Biomechanist, and Clinical Sports Nutritionist for the FIT-TRACK Smart Fitness Companion.

STRICT DOMAIN GUIDELINES:
1. Specialize strictly in human physical fitness, hypertrophy, powerlifting, calisthenics, joint biomechanics, sports nutrition (macros/calories/hydration/supplements), recovery, and gym workout programming.
2. If the user asks about non-fitness topics, politely redirect them back to sports nutrition and workout science.
3. Tone: Evidence-based, motivating, concise, and professional. Use markdown formatting with bold headers and bullet points.`;

    const name = clientContext?.name || "Athlete";
    const goal = clientContext?.goal || "General Fitness";
    const weight = Number(clientContext?.weight) || 70;
    const height = Number(clientContext?.height) || 175;
    const trainer = clientContext?.trainerName || clientContext?.trainer || "Coach";

    const contextHeader = `[ATHLETE CONTEXT: Name: ${name} | Goal: ${goal} | Weight: ${weight}kg | Height: ${height}cm | Coach: ${trainer}]\n\n`;

    const contents = [];

    // Add prior conversation history
    if (Array.isArray(history) && history.length > 0) {
      history.slice(-6).forEach((h) => {
        contents.push({
          role: h.role === "assistant" || h.role === "model" ? "model" : "user",
          parts: [{ text: h.content || h.text || "" }],
        });
      });
    }

    const currentParts = [];
    if (imageBase64) {
      let mimeType = "image/jpeg";
      let cleanBase64 = imageBase64;
      const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        cleanBase64 = match[2];
      } else {
        cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      }
      currentParts.push({
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      });
    }

    currentParts.push({
      text: `${contextHeader}${message || "Analyze this food and provide a complete nutrition and macro breakdown."}`,
    });

    contents.push({
      role: "user",
      parts: currentParts,
    });

    const modelsToTry = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.7-flash", "gemini-flash-latest"];
    let generatedText = "";
    let usedModel = "gemini-3.8-flash";

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
        const geminiRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
            generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
          }),
        });

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (generatedText) {
            usedModel = model;
            break;
          }
        }
      } catch (e) {
        console.warn(`Upstream call failed for ${model}:`, e.message);
      }
    }

    if (!generatedText) {
      return res.status(502).json({
        success: false,
        message: "Failed to generate AI response from upstream model.",
      });
    }

    let foodData = null;
    if (imageBase64) {
      const calMatch = generatedText.match(/(?:Calories|Total Calories)[\s:*~]+(\d{2,4})/i);
      const proMatch = generatedText.match(/(?:Protein)[\s:*~]+(\d{1,3})/i);
      const carbMatch = generatedText.match(/(?:Carbohydrates|Carbs)[\s:*~]+(\d{1,3})/i);
      const fatMatch = generatedText.match(/(?:Fats|Fat)[\s:*~]+(\d{1,3})/i);
      foodData = {
        dishName: "AI Analyzed Food Plate",
        calories: calMatch ? parseInt(calMatch[1], 10) : 520,
        protein: proMatch ? parseInt(proMatch[1], 10) : 42,
        carbs: carbMatch ? parseInt(carbMatch[1], 10) : 54,
        fats: fatMatch ? parseInt(fatMatch[1], 10) : 12,
        goalAlignment: "Optimal",
      };
    }

    return res.status(200).json({
      success: true,
      reply: generatedText,
      foodData,
      source: `gemini-serverless (${usedModel})`,
    });
  } catch (error) {
    console.error("Vercel AI Chat Handler Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
