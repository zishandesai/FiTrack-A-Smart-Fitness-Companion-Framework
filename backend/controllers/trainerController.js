import User from "../models/User.js";
import Workout from "../models/Workout.js";

/**
 * @route   GET /api/trainers
 * @desc    Get all registered trainers
 * @access  Private
 */
export const getTrainers = async (req, res) => {
  try {
    const trainers = await User.find({ role: "trainer" }).select("-password");

    const withStats = await Promise.all(
      trainers.map(async (t) => {
        const assignedCount = await User.countDocuments({ trainerId: t._id });
        return {
          ...t.toObject(),
          assignedMembersCount: assignedCount,
        };
      })
    );

    res.json({ success: true, count: withStats.length, trainers: withStats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   POST /api/trainers
 * @desc    Add a new trainer (Admin only)
 * @access  Private (Admin)
 */
export const createTrainer = async (req, res) => {
  try {
    const { name, email, password, phone, specialty, experience } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: "A user with this email already exists" });
    }

    const trainer = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password: password || "Trainer@12345",
      phone: phone || "",
      role: "trainer",
      goal: "Strength",
      specialty: specialty || "Strength & Hypertrophy",
      experience: experience || "5 years",
      isImmutableAdmin: false,
    });

    res.status(201).json({
      success: true,
      message: "Trainer added successfully",
      trainer: {
        id: trainer._id,
        _id: trainer._id,
        name: trainer.name,
        email: trainer.email,
        phone: trainer.phone,
        role: trainer.role,
        specialty: trainer.specialty,
        experience: trainer.experience,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   PUT /api/trainers/:id
 * @desc    Update trainer details (Admin only)
 * @access  Private (Admin)
 */
export const updateTrainer = async (req, res) => {
  try {
    const trainer = await User.findById(req.params.id);
    if (!trainer || trainer.role !== "trainer") {
      return res.status(404).json({ success: false, message: "Trainer not found" });
    }

    const updated = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.json({ success: true, trainer: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   DELETE /api/trainers/:id
 * @desc    Remove a trainer (Admin only)
 * @access  Private (Admin)
 */
export const deleteTrainer = async (req, res) => {
  try {
    const trainer = await User.findById(req.params.id);
    if (!trainer) {
      return res.status(404).json({ success: false, message: "Trainer not found" });
    }

    if (trainer.isImmutableAdmin) {
      return res.status(403).json({ success: false, message: "Cannot delete master administrator" });
    }

    // Unassign members from this trainer
    await User.updateMany({ trainerId: trainer._id }, { $set: { trainerId: null } });
    await User.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: `Trainer ${trainer.name} removed successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/trainers/dashboard-stats
 * @desc    Get Trainer portal metrics
 * @access  Private (Trainer)
 */
export const getTrainerStats = async (req, res) => {
  try {
    const trainerId = req.user._id;
    const assignedMembers = await User.find({ trainerId }).select("-password");
    const todayWorkouts = await Workout.countDocuments({ trainerId });

    res.json({
      success: true,
      stats: {
        assignedMembersCount: assignedMembers.length,
        todayWorkoutsCount: todayWorkouts,
        attentionNeededCount: assignedMembers.filter((m) => m.weight > 80).length,
      },
      members: assignedMembers,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
