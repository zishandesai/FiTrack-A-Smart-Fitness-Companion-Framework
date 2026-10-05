import mongoose from "mongoose";

const membershipSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    plan: {
      type: String,
      enum: ["BASIC", "PRO", "PREMIUM"],
      required: true,
      default: "PRO",
    },
    price: {
      type: String,
      default: "₹1,999",
    },
    paymentMethod: {
      type: String,
      default: "cash",
      enum: ["cash"],
    },
    status: {
      type: String,
      enum: ["pending", "active", "rejected", "expired"],
      default: "pending",
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year default
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast query by user and status
membershipSchema.index({ userId: 1, status: 1 });

const Membership = mongoose.model("Membership", membershipSchema);
export default Membership;
