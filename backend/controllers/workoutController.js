import Workout from "../models/Workout.js";
import User from "../models/User.js";

/**
 * @route   GET /api/workouts/:memberId
 * @desc    Get current assigned workout for member
 * @access  Private
 */
export const getMemberWorkout = async (req, res) => {
  try {
    let { memberId } = req.params;
    if (memberId === "my-workout" || memberId === "current") {
      memberId = req.user._id;
    }

    const member = await User.findById(memberId).populate("trainerId", "name email specialty");
    const trainerName = member?.trainerId?.name || "Zishan Desai";

    let workout = await Workout.findOne({ memberId }).populate("trainerId", "name email").sort({ createdAt: -1 });

    if (!workout) {
      // Default initial workout if none assigned yet
      return res.json({
        success: true,
        workout: {
          name: "Chest + Triceps Routine",
          trainer: trainerName,
          status: "assigned",
          completedAt: null,
          exercises: [
            { id: "1", name: "Bench Press", sets: 3, reps: 10, completed: false },
            { id: "2", name: "Incline Press", sets: 3, reps: 12, completed: false },
            { id: "3", name: "Triceps Pushdown", sets: 3, reps: 12, completed: false },
          ],
        },
      });
    }

    const completedCount = workout.exercises?.filter((e) => e.completed).length || 0;
    const totalCount = workout.exercises?.length || 0;

    res.json({
      success: true,
      workout: {
        ...workout.toObject(),
        trainer: workout.trainerId?.name || trainerName,
        completedCount,
        totalCount,
        progress: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   POST /api/workouts
 * @desc    Trainer assigns a customized workout routine
 * @access  Private (Trainer / Admin)
 */
export const assignWorkout = async (req, res) => {
  try {
    const { memberId, name, exercises } = req.body;
    const trainerId = req.user._id;

    if (!memberId || !name || !exercises || exercises.length === 0) {
      return res.status(400).json({ success: false, message: "Please provide memberId, routine name, and exercises" });
    }

    const newWorkout = await Workout.create({
      memberId,
      trainerId,
      name,
      exercises: exercises.map((ex) => ({ ...ex, completed: false })),
      status: "assigned",
    });

    res.status(201).json({
      success: true,
      message: `Workout routine '${name}' assigned successfully`,
      workout: newWorkout,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   PUT /api/workouts/:id
 * @desc    Member marks exercises completed or updates status
 * @access  Private (Member / Trainer)
 */
export const updateWorkout = async (req, res) => {
  try {
    const workout = await Workout.findById(req.params.id);
    if (!workout) {
      return res.status(404).json({ success: false, message: "Workout not found" });
    }

    if (req.body.exercises) {
      workout.exercises = req.body.exercises;
    }
    if (req.body.name) {
      workout.name = req.body.name;
    }

    const completedCount = workout.exercises.filter((ex) => ex.completed).length;
    const totalCount = workout.exercises.length;

    if (completedCount === totalCount && totalCount > 0) {
      workout.status = "completed";
      workout.date = new Date();
    } else if (completedCount > 0) {
      workout.status = "in-progress";
    } else {
      workout.status = "assigned";
    }

    await workout.save();

    res.json({
      success: true,
      workout: {
        ...workout.toObject(),
        completedCount,
        totalCount,
        progress: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   PUT /api/workouts/:id/complete
 * @desc    Mark all exercises in workout as completed
 * @access  Private (Member)
 */
export const completeWorkout = async (req, res) => {
  try {
    const workout = await Workout.findById(req.params.id);
    if (!workout) {
      return res.status(404).json({ success: false, message: "Workout not found" });
    }

    workout.exercises.forEach((ex) => {
      ex.completed = true;
    });
    workout.status = "completed";
    workout.date = new Date();
    await workout.save();

    // Increment workouts count on user
    await User.findByIdAndUpdate(workout.memberId, {
      $inc: { workoutsCount: 1 },
    });

    res.json({
      success: true,
      message: "Congratulations! Today's workout completed.",
      workout: {
        ...workout.toObject(),
        completedCount: workout.exercises.length,
        totalCount: workout.exercises.length,
        progress: 100,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

