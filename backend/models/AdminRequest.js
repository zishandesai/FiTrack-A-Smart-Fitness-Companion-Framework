import mongoose from "mongoose";

const adminRequestSchema = new mongoose.Schema(
  {
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requesterName: {
      type: String,
      required: true,
    },
    requesterEmail: {
      type: String,
      required: true,
      lowercase: true,
    },
    requesterRole: {
      type: String,
      enum: ["member", "trainer"],
      required: true,
    },
    type: {
      type: String,
      enum: [
        "membership_upgrade",
        "membership_renewal",
        "coach_change",
        "coach_assign",
        "custom_split",
        "equipment_request",
        "schedule_change",
        "general",
      ],
      default: "general",
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    details: {
      type: String,
      required: [true, "Details are required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    adminNote: {
      type: String,
      default: "",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

adminRequestSchema.index({ requesterId: 1, status: 1 });
adminRequestSchema.index({ status: 1, createdAt: -1 });

const AdminRequest = mongoose.model("AdminRequest", adminRequestSchema);
export default AdminRequest;
