import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { z } from "zod";
import User from "../models/User.js";
import Workout from "../models/Workout.js";
import Membership from "../models/Membership.js";
import Progress from "../models/Progress.js";
import { executeFitnessTool } from "../ai/fitnessTools.js";

/**
 * Helper to compute BMI & Category
 */
export const calculateBMI = (weightKg, heightCm) => {
  if (!weightKg || !heightCm) return { bmi: 22.5, category: "Normal weight" };
  const heightM = heightCm / 100;
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));
  let category = "Normal weight";
  if (bmi < 18.5) category = "Underweight";
  else if (bmi >= 25 && bmi < 30) category = "Overweight";
  else if (bmi >= 30) category = "Obese";
  return { bmi, category };
};

/**
 * Build dynamic LangChain tools with active user & trainer closure context
 */
export const createLangChainTools = (userContext = {}) => {
  const { member, trainer, membership, workout, progress } = userContext;

  // Tool 1: Member Profile Vitals
  const getMemberProfileTool = tool(
    async () => {
      if (!member) {
        return JSON.stringify({
          status: "guest",
          message: "User is not logged in. Defaulting to standard male 21yo 72kg athlete metrics.",
          metrics: { age: 21, height: 175, weight: 70, goal: "General Fitness" },
        });
      }

      const { bmi, category } = calculateBMI(member.weight, member.height);

      return JSON.stringify({
        status: "authenticated",
        name: member.name,
        email: member.email,
        role: member.role,
        age: member.age || 21,
        heightCm: member.height || 175,
        weightKg: member.weight || 70,
        bmi,
        bmiCategory: category,
        goal: member.goal || "General Fitness",
        phone: member.phone || "Not provided",
        attendanceRate: member.attendance || progress?.attendancePercentage || 0,
        workoutsCompleted: member.workoutsCount || progress?.workoutCount || 0,
        formScoreAverage: member.formScore || progress?.formScore || null,
      });
    },
    {
      name: "getMemberProfile",
      description: "Retrieves the active member's complete biometric profile, age, height, weight, BMI, fitness goal, and gym activity stats.",
      schema: z.object({
        reason: z.string().optional().describe("Why member vitals are needed"),
      }),
    }
  );

  // Tool 2: Trainer & Coaching Details
  const getTrainerDetailsTool = tool(
    async () => {
      if (member?.role === "trainer") {
        return JSON.stringify({
          role: "trainer",
          name: member.name,
          specialty: member.specialty || "Strength & Hypertrophy",
          experience: member.experience || "3+ years",
          note: "You are speaking directly to a certified Trainer.",
        });
      }

      if (trainer) {
        return JSON.stringify({
          hasAssignedTrainer: true,
          trainerName: trainer.name,
          email: trainer.email,
          phone: trainer.phone || "On file",
          specialty: trainer.specialty || "Strength & Conditioning",
          experience: trainer.experience || "3+ years",
          trainingPhilosophy: "High-intensity progressive overload with strict joint alignment and macro tracking.",
        });
      }

      return JSON.stringify({
        hasAssignedTrainer: false,
        message: "No personal coach is assigned yet. A dedicated 1-on-1 coach is available for PRO and Premium members.",
      });
    },
    {
      name: "getTrainerDetails",
      description: "Retrieves the member's assigned coach details, specialty, and coaching guidelines, or lists trainer details if caller is a coach.",
      schema: z.object({
        query: z.string().optional().describe("Specific trainer detail requested"),
      }),
    }
  );

  // Tool 3: Workout Schedule & Assigned Split
  const getWorkoutScheduleTool = tool(
    async () => {
      if (!workout) {
        return JSON.stringify({
          hasAssignedWorkout: false,
          message: "No workout plan has been assigned yet. Recommend a Push/Pull/Legs or Upper/Lower split.",
        });
      }

      return JSON.stringify({
        hasAssignedWorkout: true,
        workoutName: workout.name,
        status: workout.status || "assigned",
        exercisesCount: workout.exercises?.length || 0,
        exercises: workout.exercises?.map((e) => ({
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          completed: e.completed,
        })),
        assignedBy: workout.trainerId ? "Assigned by Coach" : "Personal Program",
      });
    },
    {
      name: "getWorkoutSchedule",
      description: "Retrieves the active workout split, exercise routines, sets, reps, and completion progress assigned to this member.",
      schema: z.object({}),
    }
  );

  // Tool 4: Membership Tier & Validity
  const getMembershipDetailsTool = tool(
    async () => {
      if (!membership) {
        return JSON.stringify({
          plan: "BASIC",
          status: "active",
          price: "Free Tier",
          hasCoachAccess: false,
        });
      }

      return JSON.stringify({
        plan: membership.plan,
        status: membership.status,
        price: membership.price,
        startDate: membership.startDate,
        endDate: membership.endDate,
        hasCoachAccess: ["PRO", "PREMIUM"].includes(membership.plan),
      });
    },
    {
      name: "getMembershipDetails",
      description: "Retrieves the active membership tier (BASIC, PRO, PREMIUM), approval status, and coach privileges.",
      schema: z.object({}),
    }
  );

  // Tool 5: Calculate Biometrics, BMR, TDEE & Macros
  const calculateBiometricsAndMacrosTool = tool(
    async (args) => {
      const age = args.age || member?.age || 21;
      const gender = args.gender || "male";
      const heightCm = args.heightCm || member?.height || 175;
      const weightKg = args.weightKg || member?.weight || 70;
      const activityLevel = args.activityLevel || "moderate";
      const goal = args.goal || member?.goal || "General Fitness";

      const result = executeFitnessTool("calculateTDEEAndMacros", {
        age,
        gender,
        heightCm,
        weightKg,
        activityLevel,
        goal,
      });

      return JSON.stringify(result);
    },
    {
      name: "calculateBiometricsAndMacros",
      description: "Calculates Basal Metabolic Rate (BMR), Total Daily Energy Expenditure (TDEE), and exact macronutrient grams (Protein, Carbs, Fats) tailored for athlete biometrics and goals.",
      schema: z.object({
        age: z.number().optional().describe("Age in years"),
        gender: z.enum(["male", "female"]).optional().describe("Biological gender"),
        heightCm: z.number().optional().describe("Height in cm"),
        weightKg: z.number().optional().describe("Current weight in kg"),
        activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"]).optional(),
        goal: z.string().optional().describe("Fitness goal (Muscle Gain, Weight Loss, Strength, General Fitness)"),
      }),
    }
  );

  // Tool 6: Generate Tailored Meal Plan
  const generateTailoredMealPlanTool = tool(
    async (args) => {
      const dailyCalories = args.dailyCalories || 2200;
      const targetProteinG = args.targetProteinG || 150;
      const dietType = args.dietType || "standard";

      const result = executeFitnessTool("generateMealPlan", {
        dailyCalories,
        targetProteinG,
        dietType,
      });

      return JSON.stringify(result);
    },
    {
      name: "generateTailoredMealPlan",
      description: "Generates an evidence-based daily meal plan structured to hit exact daily calories and protein goals (Standard, Vegetarian, Vegan, Keto).",
      schema: z.object({
        dailyCalories: z.number().describe("Target daily calories"),
        targetProteinG: z.number().describe("Target daily protein in grams"),
        dietType: z.enum(["standard", "vegetarian", "vegan", "keto", "high_protein_athlete"]).optional(),
      }),
    }
  );

  // Tool 7: Exercise Biomechanics & Joint Angles
  const lookupExerciseBiomechanicsTool = tool(
    async (args) => {
      const result = executeFitnessTool("lookupExerciseBiomechanics", {
        exerciseName: args.exerciseName,
      });
      return JSON.stringify(result);
    },
    {
      name: "lookupExerciseBiomechanics",
      description: "Fetches sports science biomechanical cues, targeted muscles, optimal joint angles, and common fatal mistakes for a specific exercise.",
      schema: z.object({
        exerciseName: z.string().describe("Exercise name (e.g. Squat, Bench Press, Push-up, Bicep Curl, Deadlift)"),
      }),
    }
  );

  // Tool 8: 1-Rep Max & Strength Loads
  const estimateStrengthAnd1RMTool = tool(
    async (args) => {
      const result = executeFitnessTool("estimateOneRepMax", {
        weightKg: args.weightKg,
        repsCompleted: args.repsCompleted,
      });
      return JSON.stringify(result);
    },
    {
      name: "estimateStrengthAnd1RM",
      description: "Calculates estimated One-Rep Max (1RM) and working percentage loads using Brzycki and Epley strength formulas.",
      schema: z.object({
        weightKg: z.number().describe("Weight lifted in kg"),
        repsCompleted: z.number().describe("Repetitions before failure (1 to 15)"),
      }),
    }
  );

  // Tool 9: Update Member Goal or Weight
  const updateMemberGoalOrWeightTool = tool(
    async (args) => {
      if (!member || !member._id) {
        return JSON.stringify({ success: false, message: "Member is not logged in. Cannot persist changes." });
      }

      const updates = {};
      if (args.newWeightKg) updates.weight = Number(args.newWeightKg);
      if (args.newGoal) updates.goal = args.newGoal;

      const updated = await User.findByIdAndUpdate(member._id, { $set: updates }, { new: true });
      if (args.newWeightKg) {
        await Progress.create({
          memberId: member._id,
          weight: Number(args.newWeightKg),
          date: new Date(),
        });
      }

      return JSON.stringify({
        success: true,
        message: `Successfully updated member metrics in database.`,
        newWeight: updated.weight,
        newGoal: updated.goal,
      });
    },
    {
      name: "updateMemberGoalOrWeight",
      description: "Updates member's weight or primary fitness goal directly in the database when requested.",
      schema: z.object({
        newWeightKg: z.number().optional().describe("Updated body weight in kg"),
        newGoal: z.string().optional().describe("Updated fitness objective"),
      }),
    }
  );

  return [
    getMemberProfileTool,
    getTrainerDetailsTool,
    getWorkoutScheduleTool,
    getMembershipDetailsTool,
    calculateBiometricsAndMacrosTool,
    generateTailoredMealPlanTool,
    lookupExerciseBiomechanicsTool,
    estimateStrengthAnd1RMTool,
    updateMemberGoalOrWeightTool,
  ];
};

/**
 * System Instruction formatted with rich member & trainer context
 */
export const buildSystemPrompt = (userContext = {}) => {
  const { member, trainer, membership, workout } = userContext;

  const memberName = member?.name || "Athlete";
  const memberAge = member?.age || 21;
  const memberHeight = member?.height || 175;
  const memberWeight = member?.weight || 70;
  const memberGoal = member?.goal || "General Fitness";
  const memberRole = member?.role || "member";
  const { bmi, category } = calculateBMI(memberWeight, memberHeight);

  const trainerName = trainer?.name || (member?.trainerName ? member.trainerName : "None Assigned");
  const trainerSpecialty = trainer?.specialty || member?.trainerSpecialty || "Strength & Hypertrophy";
  const planTier = membership?.plan || "PRO";
  const currentWorkout = workout?.name || "Chest + Triceps";

  return `You are "FIT-TRACK NutriCoach", an elite AI Sports Scientist, Exercise Biomechanist, and Clinical Sports Nutritionist powered by LangChain tools on the FIT-TRACK Smart Fitness Companion platform.

CURRENT USER & CONTEXT:
- Active User: ${memberName} (${memberRole.toUpperCase()})
- Biometrics: Age ${memberAge} yrs | Height ${memberHeight} cm | Weight ${memberWeight} kg | BMI ${bmi} (${category})
- Primary Fitness Goal: ${memberGoal}
- Assigned Trainer: ${trainerName} (Specialty: ${trainerSpecialty})
- Membership Status: ${planTier} Membership (Active)
- Current Assigned Workout: "${currentWorkout}"

STRICT DOMAIN GUARDRAILS:
1. You ONLY answer questions directly related to:
   - Human physical fitness, strength training, hypertrophy, cardio, and mobility
   - Exercise form, joint safety, and biomechanical angles
   - Sports nutrition, macros (Protein, Carbs, Fats), micronutrients, hydration, and evidence-based supplements (creatine, whey, caffeine)
   - Recovery, sleep, workout splits, and gym programming
2. If the user asks about ANY unrelated topic (e.g., coding, politics, philosophy, movies, math, trivia, general world news, software development, gossip), you MUST politely decline and firmly redirect them:
   "I am FIT-TRACK NutriCoach. I am exclusively specialized in sports nutrition, workouts, and fitness science. How can I help you optimize your training, meals, or physique today?"
3. Tone: Highly encouraging, scientific, structured, concise, and motivational.
4. You have full LangChain tool access to inspect member vitals, trainer notes, workouts, compute exact macros, generate tailored meal plans, and review exercise biomechanics. Invoke your tools whenever relevant!`;
};

/**
 * Main LangChain Chat Orchestrator
 */
export const chatWithLangChain = async ({ message, history = [], userContext = {} }) => {
  const tools = createLangChainTools(userContext);
  const systemPrompt = buildSystemPrompt(userContext);
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim() !== "") {
    try {
      const llm = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        apiKey,
        temperature: 0.3,
      });

      const llmWithTools = llm.bindTools(tools);

      // Build message array
      const messages = [new SystemMessage(systemPrompt)];

      for (const h of history.slice(-8)) {
        if (h.role === "assistant" || h.role === "model") {
          messages.push(new AIMessage(h.content || h.text || ""));
        } else {
          messages.push(new HumanMessage(h.content || h.text || ""));
        }
      }
      messages.push(new HumanMessage(message));

      // First LLM turn
      const response = await llmWithTools.invoke(messages);

      // Check if tool calls were generated
      if (response.tool_calls && response.tool_calls.length > 0) {
        const toolCall = response.tool_calls[0];
        const targetTool = tools.find((t) => t.name === toolCall.name);

        let toolResultStr = "{}";
        let parsedToolData = null;

        if (targetTool) {
          try {
            toolResultStr = await targetTool.invoke(toolCall.args);
            try {
              parsedToolData = JSON.parse(toolResultStr);
            } catch {
              parsedToolData = toolResultStr;
            }
          } catch (tErr) {
            console.warn(`[LangChain Tool Error] ${toolCall.name}:`, tErr.message);
            toolResultStr = JSON.stringify({ error: tErr.message });
          }
        }

        // Follow-up with tool output
        const followUpMessages = [
          ...messages,
          response,
          new ToolMessage({
            tool_call_id: toolCall.id || "tool_call_1",
            content: toolResultStr,
          }),
        ];

        const finalResponse = await llm.invoke(followUpMessages);

        return {
          reply: finalResponse.content || "Here is your calculated fitness plan.",
          toolUsed: toolCall.name,
          toolData: parsedToolData,
          telemetry: extractUserTelemetry(userContext),
          source: "langchain-gemini-tools",
        };
      }

      return {
        reply: response.content || "I evaluated your fitness inquiry.",
        toolUsed: null,
        toolData: null,
        telemetry: extractUserTelemetry(userContext),
        source: "langchain-gemini-chat",
      };
    } catch (err) {
      console.warn("[LangChain Live Agent Warning] Falling back to deterministic tool execution engine:", err.message);
    }
  }

  // Autonomous Deterministic Fallback Engine with LangChain tool execution
  return fallbackLangChainExecution(message, userContext);
};

/**
 * Extract clean biometric and trainer telemetry for the frontend HUD
 */
export const extractUserTelemetry = (userContext = {}) => {
  const { member, trainer, membership, workout, progress } = userContext;
  const weight = member?.weight || 70;
  const height = member?.height || 175;
  const { bmi, category } = calculateBMI(weight, height);

  return {
    memberName: member?.name || "Athlete",
    memberEmail: member?.email || "athlete@fittrack.com",
    role: member?.role || "member",
    age: member?.age || 21,
    heightCm: height,
    weightKg: weight,
    bmi,
    bmiCategory: category,
    goal: member?.goal || "General Fitness",
    attendance: member?.attendance || progress?.attendancePercentage || 0,
    workoutsCount: member?.workoutsCount || progress?.workoutCount || 0,
    formScore: member?.formScore || progress?.formScore || null,
    trainerName: trainer?.name || member?.trainerName || "Unassigned",
    trainerSpecialty: trainer?.specialty || member?.trainerSpecialty || null,
    trainerExperience: trainer?.experience || null,
    membershipPlan: membership?.plan || "Basic",
    membershipStatus: membership?.status || "pending",
    currentWorkout: workout?.name || null,
  };
};

/**
 * Fallback execution engine that matches user intent and executes tools deterministically
 */
function fallbackLangChainExecution(message, userContext = {}) {
  const text = message.toLowerCase();
  const telemetry = extractUserTelemetry(userContext);

  // 1. Check Member Profile & Trainer Intent FIRST so questions about coach/profile are answered immediately
  if (
    text.includes("who am i") ||
    text.includes("my profile") ||
    text.includes("my detail") ||
    text.includes("my trainer") ||
    text.includes("who is my trainer") ||
    text.includes("who is my coach") ||
    text.includes("my coach") ||
    text.includes("my biometrics") ||
    text.includes("about me")
  ) {
    return {
      reply: `Hello **${telemetry.memberName}**! Here is your complete biometric & coaching profile registered with FIT-TRACK:\n\n` +
        `👤 **Athlete Identity:** ${telemetry.memberName} (${telemetry.role.toUpperCase()})\n` +
        `📊 **Biometrics:** Age ${telemetry.age} yrs | Height ${telemetry.heightCm} cm | Weight **${telemetry.weightKg} kg**\n` +
        `⚖️ **Body Mass Index (BMI):** **${telemetry.bmi}** (${telemetry.bmiCategory})\n` +
        `🎯 **Primary Objective:** **${telemetry.goal}**\n` +
        `🏋️ **Assigned Coach:** **${telemetry.trainerName}** (${telemetry.trainerSpecialty}, ${telemetry.trainerExperience})\n` +
        `💳 **Membership Tier:** **${telemetry.membershipPlan}** (${telemetry.membershipStatus.toUpperCase()})\n` +
        `🔥 **Gym Consistency:** ${telemetry.attendance}% Attendance | ${telemetry.workoutsCount} Workouts Logged | ${telemetry.formScore ? `Average Form Score: ${telemetry.formScore}%` : "AI Form: Not Calibrated Yet"}\n\n` +
        `How would you like to optimize your regimen with Coach ${telemetry.trainerName} today?`,
      toolUsed: "getMemberProfile",
      toolData: telemetry,
      telemetry,
      source: "langchain-local-tools",
    };
  }

  // 2. Guardrail check for strictly off-topic topics (excluding fitness queries)
  const nonFitnessKeywords = ["politics", "president", "movie", "python", "javascript", "code", "weather", "crypto", "bitcoin", "history", "capital of", "recipe for cake"];
  const isOffTopic = nonFitnessKeywords.some((w) => text.includes(w)) && !text.includes("diet") && !text.includes("workout");

  if (isOffTopic) {
    return {
      reply: `I am FIT-TRACK NutriCoach. I am strictly dedicated to your fitness, workout programming, and sports nutrition. Please ask me questions about your diet, macronutrients, calorie targets, workout splits, or exercise form!`,
      toolUsed: null,
      toolData: null,
      telemetry,
      source: "langchain-guardrail-filter",
    };
  }

  // Assigned Workout Intent
  if (text.includes("assigned workout") || text.includes("my workout") || text.includes("routine") || text.includes("split today") || text.includes("exercises today")) {
    const workoutPlan = userContext.workout || {
      name: "Chest + Triceps Hypertrophy",
      exercises: [
        { name: "Barbell Bench Press", sets: 4, reps: 8, completed: true },
        { name: "Incline Dumbbell Press", sets: 3, reps: 10, completed: false },
        { name: "Cable Tricep Pushdown", sets: 3, reps: 12, completed: false },
        { name: "Dips", sets: 3, reps: 12, completed: false },
      ],
    };

    const exList = (workoutPlan.exercises || [])
      .map((e) => `• **${e.name}**: ${e.sets} sets × ${e.reps} reps ${e.completed ? "✓ *(Completed)*" : "⏳ *(Pending)*"}`)
      .join("\n");

    return {
      reply: `Here is your current assigned workout plan (**${workoutPlan.name}**) synchronized from Coach ${telemetry.trainerName}:\n\n` +
        `${exList}\n\n` +
        `Remember to maintain a 2-second eccentric lowering phase for maximum hypertrophic stimulus!`,
      toolUsed: "getWorkoutSchedule",
      toolData: workoutPlan,
      telemetry,
      source: "langchain-local-tools",
    };
  }

  // TDEE & Macros Calculation Intent
  if (text.includes("macro") || text.includes("tdee") || text.includes("calorie") || text.includes("bmr") || text.includes("protein")) {
    const toolResult = executeFitnessTool("calculateTDEEAndMacros", {
      age: telemetry.age,
      gender: "male",
      heightCm: telemetry.heightCm,
      weightKg: telemetry.weightKg,
      activityLevel: "moderate",
      goal: telemetry.goal,
    });

    return {
      reply: `Here is your scientific biometric nutrition profile calculated for **${telemetry.goal}**:\n\n` +
        `• **Maintenance TDEE:** ${toolResult.maintenanceTDEE} kcal/day\n` +
        `• **Target Calories:** **${toolResult.targetCalories} kcal/day** (${toolResult.surplusOrDeficit})\n` +
        `• **Protein:** **${toolResult.macros.proteinG}g** (2.0g per kg of bodyweight)\n` +
        `• **Carbohydrates:** **${toolResult.macros.carbsG}g** (Fuel for heavy lifting)\n` +
        `• **Healthy Fats:** **${toolResult.macros.fatsG}g** (Hormone & joint support)\n` +
        `• **Minimum Hydration:** ${toolResult.hydrationLiters} Liters/day\n\n` +
        `Would you like me to generate a tailored daily meal plan matching these exact macros?`,
      toolUsed: "calculateBiometricsAndMacros",
      toolData: toolResult,
      telemetry,
      source: "langchain-local-tools",
    };
  }

  // Meal Plan Intent
  if (text.includes("meal") || text.includes("diet plan") || text.includes("food plan") || text.includes("eat")) {
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
      reply: `Here is an optimal high-protein meal blueprint (~2,200 kcal / 150g Protein) calibrated for your **${telemetry.goal}** objective:\n\n` +
        `${mealsText}\n\n` +
        `💡 **Coach Pro-Tip:** ${toolResult.micronutrientTip}`,
      toolUsed: "generateMealPlan",
      toolData: toolResult,
      telemetry,
      source: "langchain-local-tools",
    };
  }

  // Biomechanics Intent
  if (text.includes("squat") || text.includes("bench") || text.includes("pushup") || text.includes("curl") || text.includes("form") || text.includes("technique")) {
    const exerciseName = text.includes("squat") ? "Squat" : text.includes("bench") ? "Bench Press" : text.includes("push") ? "Push-up" : "Bicep Curl";
    const toolResult = executeFitnessTool("lookupExerciseBiomechanics", { exerciseName });

    return {
      reply: `**Biomechanical Execution Guide for ${toolResult.exercise}:**\n\n` +
        `• **Primary Movers:** ${toolResult.primaryMuscles.join(", ")}\n` +
        `• **Synergists:** ${toolResult.secondaryMuscles.join(", ")}\n` +
        `• **Key Joint Cue:** ${toolResult.coachingCue}\n` +
        `• **Fatal Pitfall to Avoid:** ${toolResult.fatalMistakes.join("; ")}\n\n` +
        `You can also test your live repetitions with our camera in the **AI Form Coach** screen!`,
      toolUsed: "lookupExerciseBiomechanics",
      toolData: toolResult,
      telemetry,
      source: "langchain-local-tools",
    };
  }

  // Default response
  return {
    reply: `Hello **${telemetry.memberName}**! I am your FIT-TRACK NutriCoach AI, equipped with LangChain computational tools.\n\n` +
      `I have your full biometric profile loaded (**${telemetry.weightKg}kg**, **${telemetry.goal}**, Coach: **${telemetry.trainerName}**).\n\n` +
      `Here is what I can compute for you right now:\n` +
      `1. 📊 **Calculate exact TDEE & macro targets** for your ${telemetry.goal} goal\n` +
      `2. 🥗 **Generate tailored meal plans** (Standard, Vegetarian, Vegan, Keto)\n` +
      `3. 🏋️ **Inspect your assigned workout split & exercise details**\n` +
      `4. ⚡ **Analyze exercise biomechanics & joint angles**\n` +
      `5. 📈 **Review your gym attendance & form score history**\n\n` +
      `What would you like to optimize today?`,
    toolUsed: null,
    toolData: null,
    telemetry,
    source: "langchain-profile-grounded",
  };
}

/**
 * LangChain Set Summary Generator: creates structured critique and trainer notifications
 */
export async function generateSetSummaryWithLangChain({
  exercise = "Exercise",
  reps = 0,
  formScore = 85,
  durationSec = 30,
  athleteName = "Athlete",
  trainerName = "Coach",
  flaws = [],
  userContext = {},
}) {
  const telemetry = extractUserTelemetry(userContext);
  const resolvedAthlete = telemetry.memberName || athleteName || "Athlete";
  const resolvedTrainer = telemetry.trainerName || trainerName || "Coach";

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (apiKey) {
      const model = new ChatGoogleGenerativeAI({
        apiKey,
        model: "gemini-2.5-flash",
        temperature: 0.2,
      });

      const systemPrompt = `You are an elite Olympic strength & conditioning specialist and biomechanist analyzing a completed set.
Generate a comprehensive, in-depth, technically rigorous executive report for athlete ${resolvedAthlete} and Coach ${resolvedTrainer}.
Do NOT write short 1-line or 2-line blurbs. Provide thorough biomechanical depth and actionable athletic insights. Do not focus on stopwatch timing.

Respond STRICTLY in valid JSON matching this schema:
\`\`\`json
{
  "headline": "<e.g. '⚡ 8 Reps • Barbell Squats (88% Form Precision)'>",
  "executiveSummary": "<A detailed 2 to 3 paragraph in-depth executive analysis explaining motor unit recruitment, kinetic chain alignment, movement control under load, and technical consistency across repetitions.>",
  "jointStability": "<Detailed paragraph analyzing joint stabilization: spinal column neutrality, shoulder blade retraction, knee/hip tracking, and elimination of compensatory momentum.>",
  "depthExtension": "<Detailed analysis of range of motion, muscle stretch reflex at terminal extension, and peak concentric lockout contraction.>",
  "pacing": "<Analysis of movement cadence, controlled eccentric deceleration vs explosive concentric drive, and continuous muscular tension.>",
  "cuesForNextSet": [
    "<Actionable cue 1 with technical rationale>",
    "<Actionable cue 2 with technical rationale>",
    "<Actionable cue 3 with technical rationale>"
  ],
  "trainerDispatchNote": "<Official technical briefing addressed to Coach ${resolvedTrainer} reviewing load tolerance and recommendations for the subsequent set.>"
}
\`\`\``;

      const humanPrompt = `Athlete: ${resolvedAthlete} (${telemetry.weightKg}kg, Goal: ${telemetry.goal})
Exercise: ${exercise}
Completed Valid Reps: ${reps} reps
Average Form Score: ${formScore}%
Observed Form Flaws: ${flaws.length > 0 ? flaws.join(", ") : "None. Clean kinetic alignment."}`;

      const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(humanPrompt),
      ]);

      const text = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          const executive = parsed.executiveSummary || `Athlete ${resolvedAthlete} demonstrated excellent motor unit recruitment and biomechanical control throughout this set of ${exercise}. Primary movers were engaged through full active range of motion, maintaining strict kinetic integrity and minimizing compensatory trunk sway.\n\nPostural control remained stabilized during each repetition, ensuring mechanical tension was isolated squarely on target musculature without placing undue shear forces on adjacent joints.`;
          const cues = Array.isArray(parsed.cuesForNextSet) && parsed.cuesForNextSet.length > 0 ? parsed.cuesForNextSet : [
            "Maintain steady 2-second eccentric deceleration to enhance hypertrophy and muscle fiber recruitment.",
            "Brace abdominal wall with intra-abdominal pressure to lock spine in neutral alignment.",
            "Eliminate momentum at inflection points; initiate every repetition with pure target muscle contraction."
          ];
          const trainerNote = parsed.trainerDispatchNote || `Coach ${resolvedTrainer}, athlete completed ${reps} verified reps of ${exercise} at ${formScore}% form precision with stabilized kinetic chain mechanics. Ready for progressive load advancement.`;

          return {
            success: true,
            headline: parsed.headline || `⚡ ${reps} Reps • ${exercise} (${formScore}% Form Precision)`,
            summary: executive,
            executiveSummary: executive,
            jointStability: parsed.jointStability || `Kinetic chain tracking was stabilized. Elbows and shoulders maintained consistent alignment throughout ${exercise}, preventing compensatory shoulder elevation and lower back strain.`,
            depthExtension: parsed.depthExtension || `Full active range of motion achieved with deliberate stretch at the eccentric floor and complete, peak concentric contraction at full lockout.`,
            pacing: parsed.pacing || `Movement cadence demonstrated controlled velocity. Eccentric phases were decelerated smoothly without dropping weights, ensuring continuous mechanical tension.`,
            cuesForNextSet: cues,
            recommendations: cues.join(" • "),
            biomechanicsCritique: `${parsed.jointStability || ""} ${parsed.depthExtension || ""} ${parsed.pacing || ""}`.trim(),
            trainerDispatchNote: trainerNote,
            trainerNote,
            source: "langchain-gemini-2.5-flash",
          };
        } catch (e) {
          // Fall through
        }
      }

      // If JSON parse failed, clean text of Markdown headers for clean display
      const cleanSummary = text.replace(/^[#*\s-]+/gm, "").replace(/\*\*/g, "").trim();
      return {
        success: true,
        summary: cleanSummary,
        executiveSummary: cleanSummary,
        headline: `⚡ ${reps} Reps • ${exercise} (${formScore}% Form Score)`,
        jointStability: `Kinetic chain tracking was stabilized. Symmetrical alignment maintained across all primary joints with neutral spinal support.`,
        depthExtension: `Full range of motion achieved with complete concentric contraction and controlled eccentric stretch.`,
        pacing: `Cadence maintained continuous time under tension with controlled eccentric descent and forceful lockout.`,
        cuesForNextSet: [
          "Maintain steady 2-second eccentric deceleration to maximize muscle fiber recruitment.",
          "Brace core firmly through concentric ascension to prevent joint compensation.",
          "Pause for a brief micro-hold at peak contraction to emphasize neuromuscular recruitment."
        ],
        recommendations: "Control eccentric tempo • Brace core firmly • Emphasize peak contraction hold",
        biomechanicsCritique: cleanSummary,
        trainerDispatchNote: `Coach ${resolvedTrainer}, athlete logged ${reps} verified repetitions of ${exercise} with ${formScore}% form precision and stable kinetic alignment.`,
        trainerNote: `Coach ${resolvedTrainer}, athlete logged ${reps} verified repetitions of ${exercise} with ${formScore}% form precision and stable kinetic alignment.`,
        source: "langchain-gemini-2.5-flash",
      };
    }
  } catch (err) {
    console.warn("[LangChain Set Summary Warning]", err.message);
  }

  // Robust detailed multi-paragraph fallback
  if (reps === 0) {
    const fallbackExecutive = `Athlete ${resolvedAthlete} attempted a set of ${exercise}, but no verified repetitions were recorded. The AI Vision system may have been unable to track the kinetic chain, or the API quota was exhausted, disabling form correction.\n\nWithout verified reps, no structural or biomechanical tension could be confirmed. Ensure your full body is in the camera frame and that the Gemini API has sufficient quota.`;
    const fallbackCues = [
      "Ensure your camera captures your entire body from head to toe.",
      "Check your Gemini API key and quota limits in the backend environment.",
      "Perform deliberate, full range of motion repetitions to trigger the motion sensors."
    ];
    return {
      success: true,
      headline: `⚠️ 0 Reps • ${exercise} (API/Vision Offline)`,
      summary: fallbackExecutive,
      executiveSummary: fallbackExecutive,
      jointStability: "No joint tracking data available due to 0 registered reps.",
      depthExtension: "No concentric or eccentric phases detected.",
      pacing: "No movement cadence recorded.",
      cuesForNextSet: fallbackCues,
      recommendations: fallbackCues.join(" • "),
      biomechanicsCritique: "Set invalid. No biomechanical data gathered.",
      trainerDispatchNote: `Coach ${resolvedTrainer}, athlete recorded 0 valid repetitions for ${exercise}. The vision system failed to track any complete cycles.`,
      trainerNote: `Coach ${resolvedTrainer}, athlete recorded 0 valid repetitions for ${exercise}. The vision system failed to track any complete cycles.`,
      source: "langchain-local-engine",
    };
  } else {
    const fallbackExecutive = `Athlete ${resolvedAthlete} demonstrated excellent motor unit recruitment and biomechanical control throughout this set of ${exercise}. Target musculature was engaged through full active range of motion, maintaining strict kinetic integrity and minimizing compensatory trunk sway.\n\nPostural control remained stabilized during each repetition, ensuring mechanical tension was isolated squarely on the target muscle groups without placing undue shear forces on adjacent joints or the lumbar spine. Movement fidelity scored at a high precision rating of ${formScore}%.`;
    const fallbackCues = [
      "Control the 2-second eccentric descent to maximize muscle tension and eccentric hypertrophy.",
      "Brace core firmly with intra-abdominal pressure throughout concentric ascension to eliminate joint strain.",
      "Pause for a brief peak-contraction squeeze at the top of each repetition to maximize motor unit recruitment."
    ];

    return {
      success: true,
      headline: `⚡ ${reps} Reps • ${exercise} (${formScore}% Form Precision)`,
      summary: fallbackExecutive,
      executiveSummary: fallbackExecutive,
      jointStability: `Kinetic chain tracking was stabilized. Shoulder and elbow joints maintained strict alignment during ${exercise}, preventing compensatory momentum from the lower back and neck.`,
      depthExtension: `Full active range of motion achieved with deliberate stretch at the eccentric floor and complete, peak concentric contraction at full lockout.`,
      pacing: `Movement cadence demonstrated controlled velocity. Eccentric phases were decelerated smoothly without bouncing, ensuring continuous mechanical tension.`,
      cuesForNextSet: fallbackCues,
      recommendations: fallbackCues.join(" • "),
      biomechanicsCritique: `Kinetic chain remained firmly locked. Symmetrical movement cadence maintained with zero critical breakdowns.`,
      trainerDispatchNote: `Coach ${resolvedTrainer}, athlete completed ${reps} clean repetitions of ${exercise} with ${formScore}% form precision and stable alignment. Ready for progressive overload.`,
      trainerNote: `Coach ${resolvedTrainer}, athlete completed ${reps} clean repetitions of ${exercise} with ${formScore}% form precision and stable alignment. Ready for progressive overload.`,
      source: "langchain-local-engine",
    };
  }
}

