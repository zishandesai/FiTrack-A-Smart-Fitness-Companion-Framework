import Membership from "../models/Membership.js";
import User from "../models/User.js";

/**
 * @route   POST /api/memberships/request
 * @desc    Member requests a membership with CASH payment method
 * @access  Private (Member)
 */
export const requestMembership = async (req, res) => {
  try {
    const { plan = "PRO" } = req.body;
    const userId = req.user._id;

    const prices = {
      BASIC: "₹999",
      PRO: "₹1,999",
      PREMIUM: "₹2,999",
    };

    const newRequest = await Membership.create({
      userId,
      plan: plan.toUpperCase(),
      price: prices[plan.toUpperCase()] || "₹1,999",
      paymentMethod: "cash",
      status: "pending",
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 Year validity
    });

    res.status(201).json({
      success: true,
      message: "Membership request submitted with payment method: CASH. Please pay at gym front desk for Admin approval.",
      membership: newRequest,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/memberships
 * @desc    Get all membership requests (Admin)
 * @access  Private (Admin)
 */
export const getMemberships = async (req, res) => {
  try {
    const requests = await Membership.find()
      .populate("userId", "name email phone goal")
      .sort({ createdAt: -1 });

    const formatted = requests.map((r) => ({
      _id: r._id,
      userId: r.userId?._id,
      memberName: r.userId?.name || "Unknown Member",
      memberEmail: r.userId?.email || "No Email",
      plan: r.plan,
      price: r.price,
      paymentMethod: r.paymentMethod,
      status: r.status,
      startDate: r.startDate,
      endDate: r.endDate.toISOString().split("T")[0],
      createdAt: r.createdAt,
    }));

    res.json({ success: true, count: formatted.length, requests: formatted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   PUT /api/memberships/:id/approve
 * @desc    Admin confirms cash received & activates membership
 * @access  Private (Admin)
 */
export const approveMembership = async (req, res) => {
  try {
    const membership = await Membership.findById(req.params.id);
    if (!membership) {
      return res.status(404).json({ success: false, message: "Membership request not found" });
    }

    membership.status = "active";
    membership.approvedBy = req.user._id;
    membership.startDate = new Date();
    // Set expiry as 20 March 2027 (matching project documentation spec) or 1 year
    membership.endDate = new Date("2027-03-20T23:59:59.000Z");

    await membership.save();

    res.json({
      success: true,
      message: `Membership for plan ${membership.plan} is now ACTIVE!`,
      membership,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   PUT /api/memberships/:id/reject
 * @desc    Admin rejects membership request
 * @access  Private (Admin)
 */
export const rejectMembership = async (req, res) => {
  try {
    const membership = await Membership.findById(req.params.id);
    if (!membership) {
      return res.status(404).json({ success: false, message: "Membership request not found" });
    }

    membership.status = "rejected";
    await membership.save();

    res.json({
      success: true,
      message: "Membership request rejected",
      membership,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   PUT /api/memberships/:id/revoke
 * @desc    Admin revokes active membership (sets back to pending/unpaid)
 * @access  Private (Admin)
 */
export const revokeMembership = async (req, res) => {
  try {
    const membership = await Membership.findById(req.params.id);
    if (!membership) {
      return res.status(404).json({ success: false, message: "Membership request not found" });
    }

    membership.status = "pending";
    await membership.save();

    res.json({
      success: true,
      message: `Membership for plan ${membership.plan} marked as PENDING (Unpaid)`,
      membership,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   PUT /api/memberships/user/:userId/toggle
 * @desc    Admin directly toggles member's paid status (active <-> pending)
 * @access  Private (Admin)
 */
export const toggleUserMembership = async (req, res) => {
  try {
    const { userId } = req.params;
    let membership = await Membership.findOne({ userId }).sort({ createdAt: -1 });

    if (!membership) {
      membership = await Membership.create({
        userId,
        plan: "PRO",
        price: "₹1,999",
        paymentMethod: "cash",
        status: "active",
        startDate: new Date(),
        endDate: new Date("2027-03-20T23:59:59.000Z"),
        approvedBy: req.user._id,
      });
    } else {
      membership.status = membership.status === "active" ? "pending" : "active";
      if (membership.status === "active") {
        membership.approvedBy = req.user._id;
        membership.startDate = new Date();
      }
      await membership.save();
    }

    res.json({
      success: true,
      message: `Membership status toggled to ${membership.status.toUpperCase()}`,
      status: membership.status,
      membership,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

