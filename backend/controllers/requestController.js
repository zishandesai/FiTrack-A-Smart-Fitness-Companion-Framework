import AdminRequest from "../models/AdminRequest.js";
import Membership from "../models/Membership.js";
import User from "../models/User.js";

/**
 * @route   POST /api/requests
 * @desc    Submit a request to Admin (Member or Trainer)
 * @access  Private (Member & Trainer)
 */
export const createRequest = async (req, res) => {
  try {
    const { type, title, details } = req.body;

    if (!title || !title.trim() || !details || !details.trim()) {
      return res.status(400).json({ success: false, message: "Title and details are required" });
    }

    const newRequest = await AdminRequest.create({
      requesterId: req.user._id,
      requesterName: req.user.name,
      requesterEmail: req.user.email,
      requesterRole: req.user.role,
      type: type || "general",
      title: title.trim(),
      details: details.trim(),
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Request submitted successfully to Admin",
      request: newRequest,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/requests/my
 * @desc    Get requests submitted by currently logged-in user
 * @access  Private
 */
export const getMyRequests = async (req, res) => {
  try {
    const requests = await AdminRequest.find({ requesterId: req.user._id })
      .sort({ createdAt: -1 });

    res.json({ success: true, count: requests.length, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/requests
 * @desc    Get all requests (Admin only)
 * @access  Private (Admin)
 */
export const getAllRequests = async (req, res) => {
  try {
    const { status, role } = req.query;
    const query = {};

    if (status && status !== "all") {
      query.status = status;
    }
    if (role && role !== "all") {
      query.requesterRole = role;
    }

    const requests = await AdminRequest.find(query).sort({ createdAt: -1 });
    const pendingCount = await AdminRequest.countDocuments({ status: "pending" });

    res.json({
      success: true,
      count: requests.length,
      pendingCount,
      requests,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   PUT /api/requests/:id/review
 * @desc    Approve or Reject a request with feedback note (Admin only)
 * @access  Private (Admin)
 */
export const reviewRequest = async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be 'approved' or 'rejected'" });
    }

    const request = await AdminRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    request.status = status;
    request.adminNote = adminNote || (status === "approved" ? "Approved by Admin" : "Rejected by Admin");
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    // If request was for membership upgrade and approved, sync membership active
    if (status === "approved" && (request.type === "membership_upgrade" || request.type === "membership_renewal")) {
      const member = await User.findById(request.requesterId);
      if (member) {
        let mem = await Membership.findOne({ userId: member._id }).sort({ createdAt: -1 });
        if (mem) {
          mem.status = "active";
          mem.plan = "PRO";
          mem.approvedBy = req.user._id;
          mem.startDate = new Date();
          mem.endDate = new Date("2027-03-20T23:59:59.000Z");
          await mem.save();
        } else {
          await Membership.create({
            userId: member._id,
            plan: "PRO",
            price: "₹1,999",
            paymentMethod: "cash",
            status: "active",
            startDate: new Date(),
            endDate: new Date("2027-03-20T23:59:59.000Z"),
            approvedBy: req.user._id,
          });
        }
      }
    }

    res.json({
      success: true,
      message: `Request marked as ${status}`,
      request,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
