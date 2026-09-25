import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    phone: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["admin", "trainer", "member"],
      default: "member",
    },
    age: {
      type: Number,
      default: 21,
    },
    height: {
      type: Number, // in cm
      default: 175,
    },
    weight: {
      type: Number, // in kg
      default: 70,
    },
    goal: {
      type: String,
      enum: [
        "Muscle Gain",
        "Weight Loss",
        "Strength",
        "General Fitness",
        "muscle",
        "weight-loss",
        "fitness",
        "active",
      ],
      default: "General Fitness",
    },
    specialty: {
      type: String,
      default: "Strength & Hypertrophy",
    },
    experience: {
      type: String,
      default: "3+ years",
    },
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Special constraint: Single permanent Master Admin
    isImmutableAdmin: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving if modified
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
