/**
 * Production Fitness & Nutrition Tools for Gemini AI Function Calling
 */

export const fitnessToolDeclarations = [
  {
    name: "calculateTDEEAndMacros",
    description: "Calculates Basal Metabolic Rate (BMR), Total Daily Energy Expenditure (TDEE), and exact macronutrient grams (Protein, Carbs, Fats) based on biometrics and fitness goal.",
    parameters: {
      type: "OBJECT",
      properties: {
        age: { type: "NUMBER", description: "Age in years" },
        gender: { type: "STRING", enum: ["male", "female"], description: "Biological gender for Mifflin-St Jeor equation" },
        heightCm: { type: "NUMBER", description: "Height in centimeters" },
        weightKg: { type: "NUMBER", description: "Current weight in kilograms" },
        activityLevel: {
          type: "STRING",
          enum: ["sedentary", "light", "moderate", "active", "very_active"],
          description: "Weekly activity multiplier: sedentary (1.2), light (1.375), moderate (1.55), active (1.725), very_active (1.9)",
        },
        goal: {
          type: "STRING",
          enum: ["Muscle Gain", "Weight Loss", "Strength", "General Fitness"],
          description: "Primary fitness objective",
        },
      },
      required: ["age", "heightCm", "weightKg", "activityLevel", "goal"],
    },
  },
  {
    name: "generateMealPlan",
    description: "Generates an evidence-based daily meal plan structured to hit target calories and protein intake.",
    parameters: {
      type: "OBJECT",
      properties: {
        dailyCalories: { type: "NUMBER", description: "Target daily calories" },
        targetProteinG: { type: "NUMBER", description: "Target daily protein in grams" },
        dietType: {
          type: "STRING",
          enum: ["standard", "vegetarian", "vegan", "keto", "high_protein_athlete"],
          description: "Dietary style or restriction",
        },
        mealsPerDay: { type: "NUMBER", description: "Number of meals (3, 4, or 5)", default: 4 },
      },
      required: ["dailyCalories", "targetProteinG"],
    },
  },
  {
    name: "lookupExerciseBiomechanics",
    description: "Fetches sports science biomechanical cues, targeted muscles, optimal joint angles, and common mistakes for a specific exercise.",
    parameters: {
      type: "OBJECT",
      properties: {
        exerciseName: { type: "STRING", description: "Name of the exercise (e.g. Squat, Bench Press, Push-up, Bicep Curl, Deadlift)" },
      },
      required: ["exerciseName"],
    },
  },
  {
    name: "estimateOneRepMax",
    description: "Calculates estimated One-Rep Max (1RM) and working percentage loads using Brzycki and Epley strength formulas.",
    parameters: {
      type: "OBJECT",
      properties: {
        weightKg: { type: "NUMBER", description: "Weight lifted in kilograms" },
        repsCompleted: { type: "NUMBER", description: "Repetitions achieved before failure (1 to 15 reps)" },
      },
      required: ["weightKg", "repsCompleted"],
    },
  },
  {
    name: "evaluateRepetitionAndForm",
    description: "Evaluates video frame kinematics and posture for a specific exercise to determine if a full repetition was completed, check form correctness, evaluate cadence, and detect hazards.",
    parameters: {
      type: "OBJECT",
      properties: {
        exerciseName: { type: "STRING", description: "The exercise being evaluated (e.g. Bicep Curls, Squats, Bench Press)" },
        isRepetitionCompleted: { type: "BOOLEAN", description: "Must be TRUE ONLY if the athlete physically completed a full repetition (e.g. for bicep curl: arms curl up to full flexion and return to extension; for squats: parallel depth and stood up). FALSE if stationary, resting, or mid-rep." },
        movementPhase: { type: "STRING", enum: ["stationary_ready", "in_motion", "inflection_point", "rep_completed", "form_breakdown"], description: "Kinematic phase observed in the frame" },
        isFormCorrect: { type: "BOOLEAN", description: "True if movement adheres to biomechanical alignment; false if significant flaw observed" },
        formScore: { type: "NUMBER", description: "Biomechanical precision score between 50 and 100" },
        repCadence: { type: "STRING", enum: ["optimal", "too_fast", "too_slow"], description: "Cadence tempo evaluation" },
        cadenceFeedback: { type: "STRING", description: "Feedback on movement speed" },
        coachingCue: { type: "STRING", description: "Short actionable verbal cue for the athlete" },
        emergencyStop: { type: "BOOLEAN", description: "True if severe spinal, knee, or joint danger detected" },
        emergencyStopReason: { type: "STRING", description: "Reason for emergency stop" },
      },
      required: ["exerciseName", "isRepetitionCompleted", "movementPhase", "isFormCorrect", "formScore", "repCadence", "coachingCue"],
    },
  },
];

// Tool Implementation Logic
export const executeFitnessTool = (toolName, args) => {
  switch (toolName) {
    case "calculateTDEEAndMacros": {
      const { age, gender = "male", heightCm, weightKg, activityLevel, goal } = args;

      // Mifflin-St Jeor formula
      let bmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
      bmr += gender === "female" ? -161 : 5;

      const multipliers = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        very_active: 1.9,
      };

      const multiplier = multipliers[activityLevel] || 1.55;
      const maintenanceTDEE = Math.round(bmr * multiplier);

      let targetCalories = maintenanceTDEE;
      let surplusOrDeficit = "0 kcal (Maintenance)";

      if (goal === "Weight Loss") {
        targetCalories = Math.round(maintenanceTDEE - 500);
        surplusOrDeficit = "-500 kcal deficit (targeted fat loss ~0.5kg/week)";
      } else if (goal === "Muscle Gain") {
        targetCalories = Math.round(maintenanceTDEE + 350);
        surplusOrDeficit = "+350 kcal lean surplus (optimal hypertrophy)";
      } else if (goal === "Strength") {
        targetCalories = Math.round(maintenanceTDEE + 200);
        surplusOrDeficit = "+200 kcal surplus (power & recovery)";
      }

      // Macro breakdown: 2.2g/kg protein for lifters
      const proteinGrams = Math.round(weightKg * 2.0);
      const proteinKcal = proteinGrams * 4;

      // Fats ~25% of calories
      const fatGrams = Math.round((targetCalories * 0.25) / 9);
      const fatKcal = fatGrams * 9;

      // Remaining calories to carbs
      const carbKcal = Math.max(0, targetCalories - (proteinKcal + fatKcal));
      const carbGrams = Math.round(carbKcal / 4);

      return {
        bmr: Math.round(bmr),
        maintenanceTDEE,
        targetCalories,
        surplusOrDeficit,
        macros: {
          proteinG: proteinGrams,
          carbsG: carbGrams,
          fatsG: fatGrams,
        },
        hydrationLiters: (weightKg * 0.035).toFixed(1),
        scientificNote: "Mifflin-St Jeor validated sports nutrition baseline.",
      };
    }

    case "generateMealPlan": {
      const { dailyCalories, targetProteinG, dietType = "standard" } = args;

      const isVeg = dietType === "vegetarian" || dietType === "vegan";

      return {
        targetCalories,
        targetProteinG,
        dietType,
        meals: [
          {
            meal: "Meal 1 (Breakfast)",
            items: isVeg
              ? ["40g Oats with 250ml Soy/Almond milk", "1 scoop Plant Protein", "1 tbsp Peanut Butter", "1 Banana"]
              : ["3 Whole Eggs + 2 Egg Whites scrambled", "2 slices whole wheat toast", "1 cup Greek Yogurt with berries"],
            estimatedMacros: { kcal: Math.round(dailyCalories * 0.28), protein: Math.round(targetProteinG * 0.3) },
          },
          {
            meal: "Meal 2 (Lunch)",
            items: isVeg
              ? ["150g Grilled Tofu or Paneer", "1 cup brown rice or quinoa", "1 cup steamed broccoli & lentils"]
              : ["180g Grilled Chicken Breast or Fish", "1 cup Jasmine Rice", "Steamed asparagus or green beans with olive oil"],
            estimatedMacros: { kcal: Math.round(dailyCalories * 0.35), protein: Math.round(targetProteinG * 0.35) },
          },
          {
            meal: "Meal 3 (Pre/Post Workout)",
            items: ["1 Whey/Plant Protein Shake", "1 Apple or Rice Cakes with 1 tbsp Almond Butter"],
            estimatedMacros: { kcal: Math.round(dailyCalories * 0.15), protein: Math.round(targetProteinG * 0.15) },
          },
          {
            meal: "Meal 4 (Dinner)",
            items: isVeg
              ? ["Chana/Chickpea or Lentil Bowl", "Mixed garden salad", "1 baked sweet potato with olive oil"]
              : ["180g Lean Beef, Turkey, or Salmon", "1 medium Sweet Potato", "Large leafy green salad with avocado"],
            estimatedMacros: { kcal: Math.round(dailyCalories * 0.22), protein: Math.round(targetProteinG * 0.2) },
          },
        ],
        micronutrientTip: "Supplement with 5g Creatine Monohydrate daily + ensure adequate electrolyte intake.",
      };
    }

    case "lookupExerciseBiomechanics": {
      const name = (args.exerciseName || "").toLowerCase();

      const database = {
        squat: {
          exercise: "Barbell Back Squat",
          primaryMuscles: ["Quadriceps", "Gluteus Maximus"],
          secondaryMuscles: ["Hamstrings", "Erector Spinae", "Transverse Abdominis"],
          keyJointAngles: { kneeAngle: "90° to 100° at parallel depth", hipAngle: "80° flexion", spine: "Neutral (0° flexion)" },
          fatalMistakes: ["Knee valgus (knees caving inward during ascent)", "Lifting heels off the floor", "Spine rounding ('butt wink')"],
          coachingCue: "Screw your feet into the ground, brace your core like taking a punch, break at hips and knees together.",
        },
        "bench press": {
          exercise: "Barbell Flat Bench Press",
          primaryMuscles: ["Pectoralis Major (Sternal & Clavicular)"],
          secondaryMuscles: ["Anterior Deltoids", "Triceps Brachii"],
          keyJointAngles: { elbowTuck: "45° to 75° from torso (never 90°)", wristAngle: "Stacked directly over elbow joint" },
          fatalMistakes: ["Flaring elbows out to 90° (impinges rotator cuff)", "Bouncing the bar off the ribcage", "Lifting glutes off the bench"],
          coachingCue: "Pinch your shoulder blades into the bench, drive your legs into the floor, squeeze the bar aggressively.",
        },
        "push-up": {
          exercise: "Bodyweight Push-up",
          primaryMuscles: ["Pectoralis Major"],
          secondaryMuscles: ["Triceps Brachii", "Anterior Deltoid", "Rectus Abdominis"],
          keyJointAngles: { elbowAngle: "90° at bottom", coreAngle: "180° rigid plank alignment" },
          fatalMistakes: ["Sagging lumbar spine (core collapse)", "Forward head posture", "Partial range of motion"],
          coachingCue: "Squeeze glutes and abs to form a straight steel rod from heels to neck.",
        },
        "bicep curl": {
          exercise: "Dumbbell / Barbell Bicep Curl",
          primaryMuscles: ["Biceps Brachii (Short & Long heads)", "Brachialis"],
          secondaryMuscles: ["Brachioradialis", "Forearm Flexors"],
          keyJointAngles: { elbowFlexion: "Full 30° flexion at top contraction", torsoAngle: "0° sway" },
          fatalMistakes: ["Using lower-back momentum / torso swing", "Allowing elbows to drift forward past ribs"],
          coachingCue: "Pin your elbows to your ribcage. Control the eccentric descent for a 3-second negative.",
        },
      };

      const matchedKey = Object.keys(database).find((k) => name.includes(k));
      return (
        database[matchedKey] || {
          exercise: args.exerciseName,
          primaryMuscles: ["Target Muscle Group"],
          secondaryMuscles: ["Synergists & Stabilizers"],
          keyJointAngles: { setup: "Neutral spine, joints aligned with line of force" },
          fatalMistakes: ["Excessive momentum", "Poor joint bracing"],
          coachingCue: "Execute controlled eccentric (lowering) phase and explode through the concentric (lifting) phase.",
        }
      );
    }

    case "estimateOneRepMax": {
      const { weightKg, repsCompleted } = args;
      const reps = Math.min(Math.max(repsCompleted, 1), 15);

      // Brzycki formula: Weight / (1.0278 - 0.0278 * Reps)
      const brzycki1RM = Math.round(weightKg / (1.0278 - 0.0278 * reps));
      // Epley formula: Weight * (1 + 0.0333 * Reps)
      const epley1RM = Math.round(weightKg * (1 + 0.0333 * reps));
      const estimated1RM = Math.round((brzycki1RM + epley1RM) / 2);

      return {
        inputWeightKg: weightKg,
        repsCompleted: reps,
        estimated1RM,
        trainingPercentages: {
          power_90: Math.round(estimated1RM * 0.9),
          strength_80: Math.round(estimated1RM * 0.8),
          hypertrophy_70: Math.round(estimated1RM * 0.7),
          endurance_60: Math.round(estimated1RM * 0.6),
        },
      };
    }

    case "evaluateRepetitionAndForm": {
      const isCompleted = Boolean(args.isRepetitionCompleted);
      const isGood = args.isFormCorrect !== undefined ? Boolean(args.isFormCorrect) : true;
      const isStop = Boolean(args.emergencyStop);
      const userTriggered = Boolean(args.userTriggered);
      const phase = args.movementPhase || (isCompleted ? "rep_completed" : "in_motion");
      const repIncrement =
        !isStop && isGood && (isCompleted || userTriggered) ? 1 : 0;

      return {
        exercise: args.exerciseName || "Exercise",
        isRepetitionCompleted: repIncrement > 0,
        repIncrement,
        movementPhase: phase,
        isFormCorrect: isGood,
        formScore: Math.min(100, Math.max(50, Number(args.formScore) || (isGood ? 88 : 65))),
        repCadence: args.repCadence || "optimal",
        cadenceFeedback: args.cadenceFeedback || (phase === "stationary_ready" ? "In position. Ready to begin repetition." : "Optimal controlled cadence."),
        coachingCue: args.coachingCue || (repIncrement > 0 ? "Repetition verified! Return to extension." : "Maintain locked posture."),
        emergencyStop: isStop,
        emergencyStopReason: args.emergencyStopReason || "",
      };
    }

    default:
      return { error: `Unknown tool name: ${toolName}` };
  }
};
