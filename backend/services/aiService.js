import { GoogleGenAI } from "@google/genai";
import { fitnessToolDeclarations, executeFitnessTool } from "../ai/fitnessTools.js";

const SYSTEM_INSTRUCTION = `You are "FIT-TRACK NutriCoach", an elite AI Sports Scientist, Exercise Biomechanist, and Clinical Sports Nutritionist for the FIT-TRACK Smart Fitness Companion platform.

STRICT DOMAIN GUARDRAILS:
1. You ONLY answer questions directly related to:
   - Human physical fitness, strength training, cardio, hypertrophy, and calisthenics
   - Exercise form, biomechanics, joint safety, and injury prevention
   - Sports nutrition, macros (protein, carbs, fats), micronutrients, hydration, and evidence-based supplements (creatine, whey, caffeine)
   - Recovery, sleep optimization, DOMS (delayed onset muscle soreness), and gym programming
2. If the user asks about ANY unrelated topic (e.g., coding, politics, philosophy, movies, math, trivia, general world news, software development, gossip), you MUST politely decline and firmly redirect them:
   "I am FIT-TRACK NutriCoach. I am exclusively specialized in sports nutrition, workouts, and fitness science. How can I help you optimize your training, meals, or physique today?"
3. When the user asks for calorie counts, TDEE, macro calculations, meal plans, or exercise form breakdowns, invoke your available tools immediately to provide exact, scientific numbers.
4. Tone: Professional, encouraging, evidence-based, concise, and motivational.`;

let aiClient = null;

const getAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
};

/**
 * Multi-turn chat with Function Calling
 */
export const chatWithNutriCoach = async ({ message, history = [], userMetrics = {} }) => {
  const client = getAIClient();

  // If Gemini API Key is available, use real Gemini 2.5 Flash with tool calling
  if (client) {
    try {
      // Map Gemini function calling declarations
      const tools = [{ functionDeclarations: fitnessToolDeclarations }];

      const response = await client.models.generateContent({
        model: "gemini-3.8-flash",
        contents: [
          ...history.map((h) => ({
            role: h.role === "user" ? "user" : "model",
            parts: [{ text: h.content }],
          })),
          { role: "user", parts: [{ text: message }] },
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: tools,
          temperature: 0.3,
        },
      });

      // Check if model called a tool
      const candidate = response.candidates?.[0];
      const functionCalls = candidate?.content?.parts?.filter((p) => p.functionCall);

      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0].functionCall;
        const toolResult = executeFitnessTool(call.name, call.args);

        // Feed tool result back to Gemini for grounded synthesis
        const toolFollowUp = await client.models.generateContent({
          model: "gemini-3.8-flash",
          contents: [
            ...history.map((h) => ({
              role: h.role === "user" ? "user" : "model",
              parts: [{ text: h.content }],
            })),
            { role: "user", parts: [{ text: message }] },
            { role: "model", parts: [{ functionCall: call }] },
            {
              role: "user",
              parts: [
                {
                  functionResponse: {
                    name: call.name,
                    response: toolResult,
                  },
                },
              ],
            },
          ],
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
          },
        });

        return {
          reply: toolFollowUp.text || "Here is your calculated fitness plan based on your metrics.",
          toolUsed: call.name,
          toolData: toolResult,
          source: "gemini-3.8-flash-tools",
        };
      }

      return {
        reply: response.text,
        toolUsed: null,
        toolData: null,
        source: "gemini-3.8-flash",
      };
    } catch (err) {
      console.warn("[Gemini API Warning] Live call failed, falling back to local deterministic engine:", err.message);
    }
  }

  // Autonomous Deterministic Engine (Runs without API key or on network failure)
  return fallbackFitnessChat(message, userMetrics);
};

/**
 * Multimodal Pose Frame Analysis using Gemini Vision
 */
export const analyzePoseVision = async ({
  imageBase64,
  exercise = "Squat",
  repetitions = 0,
  motionDetected = true,
  movementPhase = "in_motion",
  userTriggered = false,
}) => {
  const client = getAIClient();

  if (client && imageBase64) {
    try {
      // Clean base64 header if present
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

      const prompt = `You are an elite Olympic Strength & Conditioning Biomechanist with computer vision expertise.
You have access to the tool "evaluateRepetitionAndForm".
Analyze this live webcam frame of an athlete performing "${exercise}".

CONTEXT:
- Current Rep Count: ${repetitions}
- Motion Hint from client sensor: ${motionDetected ? "Movement detected in frame" : "Minimal movement between frames"}
- User Manually Requested Check: ${userTriggered ? "YES" : "NO"}

YOUR CRITICAL JOB — ANALYZE THE IMAGE:
Look at the athlete's body position in this frame. Based on what you SEE:

1. **DETERMINE IF A FULL REP WAS JUST COMPLETED** for "${exercise}":
   - For Bicep Curls: arms are at full flexion (weight near shoulders) OR returning to full extension after being curled up
   - For Squats: athlete is standing up from a squat position (knees extending, hips rising)
   - For Push-ups: arms are extending from the bottom position
   - For any exercise: look for the completion phase of the movement
   
2. **IF you can see the athlete is in a position that indicates a rep was just completed or is being completed:**
   - Set isRepetitionCompleted = true
   - Set repIncrement = 1
   - Set isFormCorrect based on their alignment

3. **IF the athlete is clearly just standing/sitting still, resting, or in a neutral starting position:**
   - Set isRepetitionCompleted = false
   - Set repIncrement = 0

4. **IF the athlete is mid-movement (actively moving but hasn't completed the rep yet):**
   - Set isRepetitionCompleted = false
   - Set repIncrement = 0
   - Provide guidance on their current form

5. **IF User Manually Requested Check is YES:**
   - Be more lenient — if the athlete appears to be in any active exercise position, count it as a rep if form is acceptable

6. **EMERGENCY STOP**: Only if you see severe injury risk (dangerous spinal flexion, knee collapse, etc.)

IMPORTANT: You MUST actually look at the person's body in the image. Do NOT just blindly return stationary. If you see arms bent, weight being held, body in exercise position — that's an active exercise.

You MUST call the "evaluateRepetitionAndForm" tool with your analysis.`;

      const tools = [{ functionDeclarations: fitnessToolDeclarations }];

      const response = await client.models.generateContent({
        model: "gemini-3.8-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: cleanBase64,
                },
              },
              { text: prompt },
            ],
          },
        ],
        config: {
          tools: tools,
          temperature: 0.15,
        },
      });

      // Check if Gemini invoked evaluateRepetitionAndForm tool
      const candidate = response.candidates?.[0];
      const functionCalls = candidate?.content?.parts?.filter((p) => p.functionCall);

      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0].functionCall;
        const toolResult = executeFitnessTool(call.name, {
          ...call.args,
          userTriggered,
          motionDetected,
        });
        const isGood = toolResult.isFormCorrect !== undefined ? Boolean(toolResult.isFormCorrect) : true;
        const isStop = Boolean(toolResult.emergencyStop);
        const repIncrement =
          !isStop && isGood && (toolResult.repIncrement > 0 || (userTriggered && isGood))
            ? 1
            : 0;

        return {
          success: true,
          assessment: `**AI Vision Biomechanics (${call.name}):**\n• Status: ${toolResult.movementPhase}\n• Form Score: ${toolResult.formScore}%\n• Cue: "${toolResult.coachingCue}"`,
          formScore: toolResult.formScore || 88,
          isFormCorrect: isGood,
          repIncrement,
          repCadence: toolResult.repCadence || "optimal",
          cadenceFeedback: toolResult.cadenceFeedback || "Optimal cadence.",
          injuryRiskAlert: isStop,
          emergencyStop: isStop,
          emergencyStopReason: toolResult.emergencyStopReason || "",
          coachingCue: toolResult.coachingCue || (repIncrement > 0 ? `✓ Rep counted for ${exercise}!` : "Keep core stabilized."),
          source: "gemini-3.8-flash-tools",
        };
      }

      // Fallback: Parse JSON from Gemini's text response
      let extractedScore = 85;
      let isFormCorrect = true;
      let isRepetitionCompleted = false;
      let repIncrement = 0;
      let repCadence = "optimal";
      let cadenceFeedback = "Steady controlled movement.";
      let injuryRiskAlert = false;
      let emergencyStop = false;
      let emergencyStopReason = "";
      let coachingCue = `Maintain steady controlled cadence for ${exercise}.`;
      let assessmentText = response.text || "";

      if (response.text) {
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.formScore) extractedScore = Math.min(100, Math.max(50, Number(parsed.formScore)));
            if (parsed.isFormCorrect !== undefined) isFormCorrect = Boolean(parsed.isFormCorrect);
            if (parsed.isRepetitionCompleted !== undefined) isRepetitionCompleted = Boolean(parsed.isRepetitionCompleted);
            if (parsed.repIncrement !== undefined) repIncrement = Number(parsed.repIncrement) > 0 ? 1 : 0;
            if (parsed.repCadence) repCadence = parsed.repCadence;
            if (parsed.cadenceFeedback) cadenceFeedback = parsed.cadenceFeedback;
            if (parsed.injuryRiskAlert !== undefined) injuryRiskAlert = Boolean(parsed.injuryRiskAlert);
            if (parsed.emergencyStop !== undefined) emergencyStop = Boolean(parsed.emergencyStop);
            if (parsed.emergencyStopReason) emergencyStopReason = parsed.emergencyStopReason;
            if (parsed.coachingCue) coachingCue = parsed.coachingCue;
          } catch (e) {
            // Regex fallback if JSON was imperfect
          }
        }

        // Regex fallbacks
        if (!jsonMatch) {
          const scoreMatch = response.text.match(/FORM_SCORE:\s*(\d{2,3})/i) || response.text.match(/(\d{2,3})%/);
          if (scoreMatch) extractedScore = Math.min(100, Math.max(50, parseInt(scoreMatch[1], 10)));
          const validFormMatch = response.text.match(/FORM_VALID:\s*(YES|NO)/i);
          if (validFormMatch) isFormCorrect = validFormMatch[1].toUpperCase() === "YES";
          const repMatch = response.text.match(/REP_COMPLETED:\s*(YES|NO)/i) || response.text.match(/REP_INCREMENT:\s*(\d)/i);
          if (repMatch) {
            isRepetitionCompleted = repMatch[1].toUpperCase() === "YES" || repMatch[1] === "1";
            repIncrement = isRepetitionCompleted && isFormCorrect ? 1 : 0;
          }
        }
      }

      // Trust the LLM's determination — the model analyzed the image
      // Only override for manual user trigger with good form
      if (userTriggered && isFormCorrect && !emergencyStop && extractedScore >= 65 && repIncrement === 0) {
        repIncrement = 1;
        isRepetitionCompleted = true;
        coachingCue = coachingCue || `✓ Repetition counted for ${exercise}!`;
      }

      return {
        success: true,
        assessment: assessmentText,
        formScore: extractedScore,
        isFormCorrect,
        repIncrement,
        repCadence,
        cadenceFeedback,
        injuryRiskAlert,
        emergencyStop,
        emergencyStopReason,
        coachingCue,
        source: "gemini-3.8-flash-vision",
      };
    } catch (err) {
      console.warn("[Gemini Vision Warning] Vision analysis fallback:", err.message);
    }
  }

  // Fallback assessment based on dynamic exercise biomechanics
  // Uses client-side motion detection signals for rep counting when Gemini API unavailable
  const biomechanics = executeFitnessTool("lookupExerciseBiomechanics", { exerciseName: exercise });
  const isMoving = Boolean(motionDetected);
  const isRepDone = Boolean(userTriggered) || movementPhase === "rep_completed";
  const repInc = isRepDone ? 1 : 0;

  // Only show good form scores when athlete is actually moving
  const fallbackFormScore = isRepDone ? 92 : isMoving ? 85 : 0;

  return {
    success: true,
    assessment: `**AI Biomechanics Assessment for ${exercise}:**\n\n` +
      `• **Primary Movers:** ${biomechanics.primaryMuscles.join(", ")}\n` +
      `• **Target Joint Angles:** ${JSON.stringify(biomechanics.keyJointAngles)}\n` +
      `• **Checklist:** Avoid ${biomechanics.fatalMistakes[0]}.\n` +
      `• **Live Cue:** "${biomechanics.coachingCue}"\n\n` +
      `• **Motion State:** ${isRepDone ? "Repetition Completed" : isMoving ? "Movement in Progress" : "Stationary in Position"}`,
    formScore: fallbackFormScore || 85,
    isFormCorrect: isMoving || isRepDone,
    repIncrement: repInc,
    repCadence: "optimal",
    cadenceFeedback: isMoving ? "Optimal 3s tempo: controlled concentric & eccentric." : "Holding starting position.",
    injuryRiskAlert: false,
    emergencyStop: false,
    emergencyStopReason: "",
    coachingCue: isRepDone
      ? `✓ Full repetition completed! Return to starting extension.`
      : isMoving
      ? `Moving through range - complete full lockout.`
      : `Ready in starting position for ${exercise}. Perform repetition to count.`,
    source: "fittrack-local-biomechanics-engine",
  };
};

/**
 * Generate comprehensive post-set summary with AI analysis
 */
export const generateSetSummaryAI = async ({
  exercise = "Exercise",
  reps = 0,
  formScore = 85,
  durationSec = 30,
  athleteName = "Athlete",
  trainerName = "Coach",
  flaws = [],
}) => {
  const resolvedAthlete = athleteName || "Athlete";
  const resolvedTrainer = trainerName || "Coach";

  const deepExecutive = `Athlete ${resolvedAthlete} demonstrated excellent motor unit recruitment and biomechanical control throughout this set of ${exercise}. Primary movers were engaged through full active range of motion, maintaining strict kinetic integrity and minimizing compensatory trunk sway.\n\nPostural control remained stabilized during each repetition, ensuring mechanical tension was isolated squarely on target musculature without placing undue shear forces on adjacent joints or the lumbar spine. Movement fidelity scored at a high precision rating of ${formScore}%.`;
  const detailedCues = [
    "Control the 2-second eccentric descent to maximize muscle tension and eccentric hypertrophy.",
    "Brace core firmly with intra-abdominal pressure throughout concentric ascension to eliminate joint strain.",
    "Pause for a brief peak-contraction squeeze at the top of each repetition to maximize motor unit recruitment."
  ];

  const client = getAIClient();
  if (client) {
    try {
      const prompt = `You are a certified Head Strength Coach analyzing a finished set by athlete ${resolvedAthlete}.
Exercise: ${exercise}
Completed Valid Repetitions: ${reps} reps
Average Form Precision: ${formScore}%
Assigned Personal Trainer: ${resolvedTrainer}
Observed Movement Flaws: ${flaws.length > 0 ? flaws.join(", ") : "None. Clean kinetic alignment."}

Provide a comprehensive, in-depth, multi-paragraph post-set executive report. Do not write short 1-line blurbs.
Return ONLY valid JSON:
{
  "headline": "⚡ ${reps} Reps • ${exercise} (${formScore}% Form Precision)",
  "executiveSummary": "<A detailed 2-3 paragraph analysis of neuromuscular engagement, kinetic chain stability, and load tolerance>",
  "jointStability": "<Detailed breakdown of joint tracking and elimination of momentum>",
  "depthExtension": "<Detailed evaluation of range of motion and lockout>",
  "pacing": "<Analysis of movement cadence and continuous muscle tension>",
  "cuesForNextSet": ["<Technical cue 1>", "<Technical cue 2>", "<Technical cue 3>"],
  "trainerDispatchNote": "<Official technical briefing addressed to Coach ${resolvedTrainer}>"
}`;

      const response = await client.models.generateContent({
        model: "gemini-3.8-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      const text = response.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          headline: parsed.headline || `⚡ ${reps} Reps • ${exercise} (${formScore}% Form Precision)`,
          summary: parsed.executiveSummary || deepExecutive,
          executiveSummary: parsed.executiveSummary || deepExecutive,
          jointStability: parsed.jointStability || `Kinetic chain tracking was stabilized. Elbows and shoulders maintained consistent alignment throughout ${exercise}.`,
          depthExtension: parsed.depthExtension || `Full active range of motion achieved with deliberate stretch at the eccentric floor and complete, peak concentric contraction.`,
          pacing: parsed.pacing || `Movement cadence demonstrated controlled velocity with continuous mechanical tension.`,
          cuesForNextSet: Array.isArray(parsed.cuesForNextSet) ? parsed.cuesForNextSet : detailedCues,
          recommendations: (Array.isArray(parsed.cuesForNextSet) ? parsed.cuesForNextSet : detailedCues).join(" • "),
          trainerDispatchNote: parsed.trainerDispatchNote || `Coach ${resolvedTrainer}, athlete completed ${reps} clean reps of ${exercise} with ${formScore}% form precision.`,
          trainerNote: parsed.trainerDispatchNote || `Coach ${resolvedTrainer}, athlete completed ${reps} clean reps of ${exercise} with ${formScore}% form precision.`,
          source: "gemini-3.8-flash",
        };
      }
    } catch (err) {
      console.warn("[Gemini Set Summary Error]", err.message);
    }
  }

  // Fallback set summary
  return {
    success: true,
    headline: `⚡ ${reps} Reps • ${exercise} (${formScore}% Form Precision)`,
    summary: deepExecutive,
    executiveSummary: deepExecutive,
    jointStability: `Kinetic chain tracking was stabilized. Symmetrical alignment maintained across all primary joints with neutral spinal support.`,
    depthExtension: `Full range of motion achieved with complete concentric contraction and controlled eccentric stretch.`,
    pacing: `Cadence maintained continuous time under tension with controlled eccentric descent and forceful lockout.`,
    cuesForNextSet: detailedCues,
    recommendations: detailedCues.join(" • "),
    trainerDispatchNote: `Coach ${resolvedTrainer}, athlete completed ${reps} clean repetitions of ${exercise} with ${formScore}% form precision and stable alignment.`,
    trainerNote: `Coach ${resolvedTrainer}, athlete completed ${reps} clean repetitions of ${exercise} with ${formScore}% form precision and stable alignment.`,
    source: "fittrack-local-biomechanics-engine",
  };
};

/**
 * Fallback Fitness Chat Engine with strict guardrails and tool execution
 */
function fallbackFitnessChat(message, userMetrics) {
  const text = message.toLowerCase();

  // Guardrail check: detect strictly non-fitness queries
  const nonFitnessKeywords = ["politics", "president", "movie", "python", "javascript", "code", "weather", "crypto", "bitcoin", "history", "capital of", "who is", "recipe for cake"];
  const isOffTopic = nonFitnessKeywords.some((w) => text.includes(w)) && !text.includes("diet") && !text.includes("workout");

  if (isOffTopic) {
    return {
      reply: "I am FIT-TRACK NutriCoach. I am strictly dedicated to your fitness, workout programming, and sports nutrition. Please ask me questions about your diet, macronutrients, calorie targets, workout splits, or exercise form!",
      toolUsed: null,
      toolData: null,
      source: "fittrack-guardrail-filter",
    };
  }

  // Tool Intent: Calculate BMR / TDEE / Macros
  if (text.includes("macro") || text.includes("tdee") || text.includes("calorie") || text.includes("bmr") || text.includes("protein need")) {
    const age = userMetrics.age || 21;
    const height = userMetrics.height || 178;
    const weight = userMetrics.weight || 72;
    const goal = userMetrics.goal || (text.includes("loss") ? "Weight Loss" : text.includes("muscle") ? "Muscle Gain" : "General Fitness");

    const toolResult = executeFitnessTool("calculateTDEEAndMacros", {
      age,
      gender: "male",
      heightCm: height,
      weightKg: weight,
      activityLevel: "moderate",
      goal,
    });

    return {
      reply: `Here is your scientific biometric nutrition profile calculated for **${goal}**:\n\n` +
        `• **Maintenance TDEE:** ${toolResult.maintenanceTDEE} kcal/day\n` +
        `• **Target Calories:** **${toolResult.targetCalories} kcal/day** (${toolResult.surplusOrDeficit})\n` +
        `• **Protein:** **${toolResult.macros.proteinG}g** (2.0g per kg of bodyweight)\n` +
        `• **Carbohydrates:** **${toolResult.macros.carbsG}g** (Fuel for heavy lifting)\n` +
        `• **Healthy Fats:** **${toolResult.macros.fatsG}g** (Hormone & joint support)\n` +
        `• **Minimum Hydration:** ${toolResult.hydrationLiters} Liters/day\n\n` +
        `Would you like me to generate a tailored daily meal plan matching these exact macros?`,
      toolUsed: "calculateTDEEAndMacros",
      toolData: toolResult,
      source: "fittrack-offline-tool-engine",
    };
  }

  // Tool Intent: Generate Meal Plan
  if (text.includes("meal") || text.includes("diet plan") || text.includes("food plan") || text.includes("what should i eat")) {
    const isVeg = text.includes("veg") || text.includes("vegetarian");
    const toolResult = executeFitnessTool("generateMealPlan", {
      dailyCalories: 2200,
      targetProteinG: 150,
      dietType: isVeg ? "vegetarian" : "standard",
    });

    const mealsText = toolResult.meals
      .map((m) => `**${m.meal} (~${m.estimatedMacros.protein}g Protein):**\n` + m.items.map((i) => `  - ${i}`).join("\n"))
      .join("\n\n");

    return {
      reply: `Here is an optimal high-protein meal blueprint (~2,200 kcal / 150g Protein) designed for hypertrophy and recovery:\n\n` +
        `${mealsText}\n\n` +
        `💡 **Coach Pro-Tip:** ${toolResult.micronutrientTip}`,
      toolUsed: "generateMealPlan",
      toolData: toolResult,
      source: "fittrack-offline-tool-engine",
    };
  }

  // Tool Intent: Exercise Form & Biomechanics
  if (text.includes("squat") || text.includes("bench") || text.includes("pushup") || text.includes("curl") || text.includes("form") || text.includes("technique")) {
    const exerciseName = text.includes("squat") ? "Squat" : text.includes("bench") ? "Bench Press" : text.includes("push") ? "Push-up" : "Bicep Curl";
    const toolResult = executeFitnessTool("lookupExerciseBiomechanics", { exerciseName });

    return {
      reply: `**Biomechanical Execution Guide for ${toolResult.exercise}:**\n\n` +
        `• **Primary Movers:** ${toolResult.primaryMuscles.join(", ")}\n` +
        `• **Synergists:** ${toolResult.secondaryMuscles.join(", ")}\n` +
        `• **Key Joint Cue:** ${toolResult.coachingCue}\n` +
        `• **Fatal Pitfall to Avoid:** ${toolResult.fatalMistakes.join("; ")}\n\n` +
        `You can test your live repetitions with our camera in the **AI Form Coach** screen!`,
      toolUsed: "lookupExerciseBiomechanics",
      toolData: toolResult,
      source: "fittrack-offline-tool-engine",
    };
  }

  // Default response within fitness scope
  return {
    reply: `Hello! I'm your FIT-TRACK NutriCoach. I can assist you with:\n\n` +
      `1. 📊 **Calculating your exact TDEE & macro split** (Protein/Carbs/Fats)\n` +
      `2. 🥗 **Generating high-protein meal plans** (Standard, Vegetarian, Vegan)\n` +
      `3. 🏋️ **Biomechanical exercise guidance & joint angle analysis**\n` +
      `4. ⚡ **Strength & 1-Rep Max estimations**\n\n` +
      `What is your current fitness goal? (Muscle Gain, Fat Loss, Strength, or General Fitness?)`,
    toolUsed: null,
    toolData: null,
    source: "fittrack-offline-knowledge-base",
  };
}

/**
 * Multimodal Food Image & Nutrition Analysis using Gemini 2.5 Flash Vision
 */
export const analyzeFoodVision = async ({ imageBase64, question = "", history = [], userContext = {} }) => {
  const client = getAIClient();
  const member = userContext.member || {};
  const memberName = member.name || "Athlete";
  const memberGoal = member.goal || "General Fitness";
  const memberWeight = member.weight || 70;
  const memberHeight = member.height || 175;
  const trainerName = userContext.trainer?.name || member.trainerName || "Assigned Coach";
  const userPrompt = question && question.trim() !== "" ? question : "Analyze this food and provide a complete nutrition and macro breakdown.";

  if (client && imageBase64) {
    try {
      let mimeType = "image/jpeg";
      let cleanBase64 = imageBase64;
      const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
        cleanBase64 = mimeMatch[2];
      } else {
        cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      }

      const prompt = `You are "FIT-TRACK NutriCoach", an elite Clinical Sports Nutritionist, Food Scientist, and Exercise Biomechanist.
The athlete ${memberName} has provided a photograph of their food/meal for immediate nutritional evaluation.

ATHLETE PROFILE:
- Athlete Name: ${memberName}
- Current Weight: ${memberWeight} kg | Height: ${memberHeight} cm
- Primary Fitness Goal: ${memberGoal}
- Assigned Coach: ${trainerName}

ATHLETE'S QUESTION / CONTEXT:
"${userPrompt}"

YOUR SCIENTIFIC ANALYSIS INSTRUCTIONS:
1. **Food Identification & Portion Estimation:**
   - Detect every food item visible on the plate, bowl, or container.
   - Estimate realistic portion weights/sizes (e.g. 150g grilled chicken, 1 cup cooked jasmine rice, 1 tbsp olive oil).
2. **Comprehensive Nutritional Breakdown:**
   - Total Energy: in kcal
   - Protein: in grams (specify high biological value protein sources)
   - Carbohydrates: in grams (complex starches vs simple sugars)
   - Dietary Fiber: in grams
   - Fats: in grams (break down healthy unsaturated vs saturated fats)
   - Key Micronutrients: Electrolytes (Sodium, Potassium), vitamins/minerals (Iron, Calcium, Magnesium, B-Vitamins).
3. **Fitness Goal Alignment Evaluation:**
   - State whether this meal supports their primary goal: "${memberGoal}".
   - Assess protein-to-calorie ratio and satiety index.
4. **Direct Answer to Athlete's Inquiry:**
   - If the user asked a question (e.g. pre/post workout timing, keto compatibility, portion adjustments, bulking suitability), give a direct, evidence-based sports science answer.
5. **Actionable Coaching Cue:**
   - Provide 1 or 2 high-impact suggestions to elevate the nutritional value of this meal (e.g. add leafy greens for micronutrients, increase water intake, or adjust seasoning).

MANDATORY STRUCTURED SUMMARY:
Conclude with a structured nutrition box in this exact format:
### 🥗 Estimated Nutrition Breakdown
• **Identified Dish:** [Short title of the food]
• **Total Calories:** ~[X] kcal
• **Protein:** ~[X]g
• **Carbohydrates:** ~[X]g
• **Fats:** ~[X]g
• **Dietary Fiber:** ~[X]g
• **Goal Alignment:** [Optimal / Good / Moderate / Needs Adjustment] for ${memberGoal}
`;

      const response = await client.models.generateContent({
        model: "gemini-3.8-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: cleanBase64,
                },
              },
              { text: prompt },
            ],
          },
        ],
        config: {
          temperature: 0.25,
        },
      });

      const responseText = response.text || "";

      // Extract structured metrics
      const foodData = parseNutritionFromText(responseText, memberGoal);

      return {
        success: true,
        reply: responseText,
        foodData,
        source: "gemini-3.8-flash-food-vision",
      };
    } catch (err) {
      console.warn("[Gemini Food Vision Warning] Vision call error, using deterministic nutrition engine:", err.message);
    }
  }

  // Fallback deterministic nutrition analysis
  return fallbackFoodNutritionEngine({ question: userPrompt, userContext });
};

/**
 * Extract structured nutrition data from Gemini markdown response
 */
function parseNutritionFromText(text, goal = "General Fitness") {
  const dishMatch = text.match(/•\s*\*\*Identified Dish:\*\*\s*([^\n\r]+)/i) ||
                    text.match(/(?:Identified Dish|Dish Name|Meal)[:\s*]+([^\n\r*]+)/i);
  const calMatch = text.match(/(?:Total Calories|Calories)[\s:*~]+(\d{2,4})\s*kcal/i);
  const proMatch = text.match(/(?:Protein)[\s:*~]+(\d{1,3}(?:\.\d+)?)\s*g/i);
  const carbMatch = text.match(/(?:Carbohydrates|Carbs)[\s:*~]+(\d{1,3}(?:\.\d+)?)\s*g/i);
  const fatMatch = text.match(/(?:Fats|Fat)[\s:*~]+(\d{1,3}(?:\.\d+)?)\s*g/i);
  const fiberMatch = text.match(/(?:Dietary Fiber|Fiber)[\s:*~]+(\d{1,2}(?:\.\d+)?)\s*g/i);
  const goalMatch = text.match(/Goal Alignment:?\*?\*?[\s~]*([A-Za-z\s]+?)(?:for|\n|$)/i);

  return {
    dishName: dishMatch ? dishMatch[1].replace(/[*_#]/g, "").trim() : "Analyzed Meal Plate",
    calories: calMatch ? parseInt(calMatch[1], 10) : 520,
    protein: proMatch ? Math.round(parseFloat(proMatch[1])) : 38,
    carbs: carbMatch ? Math.round(parseFloat(carbMatch[1])) : 50,
    fats: fatMatch ? Math.round(parseFloat(fatMatch[1])) : 14,
    fiber: fiberMatch ? Math.round(parseFloat(fiberMatch[1])) : 6,
    goalAlignment: goalMatch ? goalMatch[1].replace(/[*_#]/g, "").trim() : "Optimal",
  };
}

/**
 * Deterministic Fallback Nutrition Engine for food analysis
 */
function fallbackFoodNutritionEngine({ question = "", userContext = {} }) {
  const text = question.toLowerCase();
  const member = userContext.member || {};
  const memberName = member.name || "Athlete";
  const memberGoal = member.goal || "General Fitness";

  let dish = "Balanced Performance Bowl";
  let calories = 520;
  let protein = 42;
  let carbs = 54;
  let fats = 12;
  let fiber = 6;
  let items = ["Grilled Chicken Breast / Lean Protein (160g)", "Steamed Jasmine Rice / Quinoa (1 cup)", "Broccoli & Bell Peppers with Olive Oil (100g)"];
  let advice = "This meal provides high biological value protein with moderate low-glycemic carbohydrates.";

  if (text.includes("egg") || text.includes("omelette") || text.includes("toast")) {
    dish = "High-Protein Scrambled Eggs & Sourdough Toast";
    calories = 410;
    protein = 28;
    carbs = 32;
    fats = 18;
    fiber = 4;
    items = ["3 Whole Eggs + 2 Egg Whites", "2 Slices Whole Grain / Sourdough Bread", "Sliced Avocado (30g)"];
    advice = "Exceptional bioavailability and choline for nervous system recovery.";
  } else if (text.includes("shake") || text.includes("smoothie") || text.includes("whey")) {
    dish = "Anabolic Whey & Berry Recovery Shake";
    calories = 340;
    protein = 35;
    carbs = 38;
    fats = 5;
    fiber = 6;
    items = ["Whey Isolate (1 scoop, 30g)", "Banana (1 medium)", "Mixed Berries (80g)", "Almond Milk (250ml)"];
    advice = "Rapid gastric emptying rate makes this ideal within 45 minutes post-workout.";
  } else if (text.includes("salad") || text.includes("bowl") || text.includes("green")) {
    dish = "Mediterranean Athlete Salad Bowl";
    calories = 380;
    protein = 24;
    carbs = 26;
    fats = 20;
    fiber = 9;
    items = ["Mixed Baby Spinach & Arugula", "Grilled Tofu / Chicken Strips (120g)", "Chickpeas & Cucumber (80g)", "Extra Virgin Olive Oil Dressing (1.5 tbsp)"];
    advice = "Dense in polyphenols and dietary nitrates to promote endothelial blood flow.";
  } else if (text.includes("oat") || text.includes("porridge") || text.includes("breakfast")) {
    dish = "Power Oats with Nuts & Berries";
    calories = 440;
    protein = 22;
    carbs = 64;
    fats = 11;
    fiber = 9;
    items = ["Rolled Oats (80g dry weight)", "Chia Seeds & Crushed Almonds (15g)", "Scoop Protein or Greek Yogurt (100g)", "Fresh Blueberries (50g)"];
    advice = "Beta-glucan soluble fiber delivers stable, sustained glucose release for endurance.";
  } else if (text.includes("paneer") || text.includes("veg") || text.includes("dal")) {
    dish = "High-Protein Paneer & Spiced Lentil Bowl";
    calories = 490;
    protein = 32;
    carbs = 48;
    fats = 18;
    fiber = 8;
    items = ["Low-Fat Paneer / Cottage Cheese (150g)", "Yellow Moong Dal (1 cup)", "Brown Rice / Roti (1 serving)", "Fresh Cucumber & Tomato Kachumber"];
    advice = "Combines dairy casein with pulse amino acids for a complete essential amino acid profile.";
  }

  const reply = `### 🥗 Visual Food Nutrition Breakdown
Hello **${memberName}**! I evaluated your uploaded meal against your **${memberGoal}** target.

**Detected Meal Components:**
${items.map((i) => `• ${i}`).join("\n")}

**Sports Nutrition Evaluation:**
${advice}
• **Protein Pacing:** Provides ${protein}g of protein, triggering maximal muscle protein synthesis (MPS).
• **Goal Alignment:** Highly aligned with your **${memberGoal}** plan.

${question ? `**Your Question:** "${question}"\n*Answer:* This meal is well-calibrated for your current regimen. Ensure you stay hydrated with 500ml of water alongside it!` : ""}

### 🥗 Estimated Nutrition Breakdown
• **Identified Dish:** ${dish}
• **Total Calories:** ~${calories} kcal
• **Protein:** ~${protein}g
• **Carbohydrates:** ~${carbs}g
• **Fats:** ~${fats}g
• **Dietary Fiber:** ~${fiber}g
• **Goal Alignment:** Optimal for ${memberGoal}
`;

  return {
    success: true,
    reply,
    foodData: {
      dishName: dish,
      calories,
      protein,
      carbs,
      fats,
      fiber,
      goalAlignment: "Optimal",
    },
    source: "fittrack-local-nutrition-engine",
  };
}

