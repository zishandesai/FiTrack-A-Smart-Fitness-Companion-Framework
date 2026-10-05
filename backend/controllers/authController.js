import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Membership from "../models/Membership.js";
import { getDBStatus } from "../config/db.js";

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "fittrack_secret_key_default", {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });
};

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user (Strictly enforced as role "member")
 * @access  Public
 */
export const register = async (req, res) => {
  try {
    const { name, email, password, phone, age, height, weight, goal, role, specialty, experience } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Please provide Name, Email, and Password" });
    }

    if (mongoose.connection.readyState !== 1 && !getDBStatus()) {
      return res.status(503).json({
        success: false,
        message: "Database is offline or still connecting. Please try again in a few seconds or check your connection.",
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "An account with this email already exists" });
    }

    // Role can be "trainer" or "member". ("admin" is strictly immutable and protected)
    const resolvedRole = role === "trainer" ? "trainer" : "member";

    const goalMap = {
      muscle: "Muscle Gain",
      "weight-loss": "Weight Loss",
      fitness: "General Fitness",
      active: "General Fitness",
      strength: "Strength",
      "Muscle Gain": "Muscle Gain",
      "Weight Loss": "Weight Loss",
      Strength: "Strength",
      "General Fitness": "General Fitness",
    };
    const resolvedGoal = goalMap[goal] || "General Fitness";

    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password,
      phone: phone || "",
      role: resolvedRole,
      age: Number(age) || 21,
      height: Number(height) || 175,
      weight: Number(weight) || 70,
      goal: resolvedGoal,
      specialty: specialty || "Strength & Hypertrophy",
      experience: experience || "3+ years",
      isImmutableAdmin: false,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: `${resolvedRole === "trainer" ? "Trainer" : "Member"} account created successfully! Welcome to FIT-TRACK.`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        specialty: user.specialty,
        experience: user.experience,
        age: user.age,
        height: user.height,
        weight: user.weight,
        goal: user.goal,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get JWT token
 * @access  Public
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Please enter both email and password" });
    }

    if (mongoose.connection.readyState !== 1 && !getDBStatus()) {
      return res.status(503).json({
        success: false,
        message: "Database is offline or still connecting. Please try again in a few seconds or check your connection.",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).populate("trainerId", "name email specialty experience phone");
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const token = generateToken(user._id);

    // Fetch active or pending membership
    const membership = await Membership.findOne({ userId: user._id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        specialty: user.specialty,
        experience: user.experience,
        age: user.age,
        height: user.height,
        weight: user.weight,
        goal: user.goal,
        trainerId: user.trainerId ? (user.trainerId._id || user.trainerId) : null,
        trainerName: user.trainerId?.name || null,
        trainerSpecialty: user.trainerId?.specialty || null,
        trainerPhone: user.trainerId?.phone || null,
        isImmutableAdmin: user.isImmutableAdmin,
        membership: membership ? membership.plan : null,
        membershipStatus: membership ? membership.status : "none",
        membershipExpiry: membership ? membership.endDate.toISOString().split("T")[0] : null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged in user details
 * @access  Private
 */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password")
      .populate("trainerId", "name email specialty experience phone");
    const membership = await Membership.findOne({ userId: user._id }).sort({ createdAt: -1 });

    const userObj = user ? user.toObject() : {};
    res.json({
      success: true,
      user: {
        ...userObj,
        trainerId: user?.trainerId ? (user.trainerId._id || user.trainerId) : null,
        trainerName: user?.trainerId?.name || null,
        trainerSpecialty: user?.trainerId?.specialty || null,
        trainerPhone: user?.trainerId?.phone || null,
        membership: membership ? membership.plan : null,
        membershipStatus: membership ? membership.status : "none",
        membershipExpiry: membership ? membership.endDate : null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   PUT /api/auth/password
 * @desc    Change user password
 * @access  Private
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Current password does not match" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
