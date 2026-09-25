import User from "../models/User.js";
import Membership from "../models/Membership.js";
import Workout from "../models/Workout.js";

/**
 * @route   GET /api/members
 * @desc    Get all members (Admin & Trainer)
 * @access  Private (Admin / Trainer)
 */
export const getMembers = async (req, res) => {
  try {
    const query = { role: "member" };

    // If Trainer, filter to assigned members
    if (req.user.role === "trainer") {
      query.trainerId = req.user._id;
    }

    const members = await User.find(query)
      .select("-password")
      .populate("trainerId", "name email specialty experience phone")
      .sort({ createdAt: -1 });

    // Attach latest membership plan & workout status
    const populated = await Promise.all(
      members.map(async (m) => {
        const mem = await Membership.findOne({ userId: m._id }).sort({ createdAt: -1 });
        const workout = await Workout.findOne({ memberId: m._id }).sort({ createdAt: -1 });

        const totalEx = workout?.exercises?.length || 0;
        const completedEx = workout?.exercises?.filter((e) => e.completed).length || 0;
        const calcProgress = totalEx > 0 ? Math.round((completedEx / totalEx) * 100) : (m.workoutsCount > 0 ? 100 : 0);

        return {
          ...m.toObject(),
          plan: mem ? mem.plan : "None",
          membershipStatus: mem ? mem.status : "none",
          progress: workout ? calcProgress : 0,
          todayWorkout: workout
            ? {
                id: workout._id,
                name: workout.name,
                status: workout.status || (completedEx === totalEx && totalEx > 0 ? "completed" : completedEx > 0 ? "in-progress" : "assigned"),
                completedCount: completedEx,
                totalCount: totalEx,
                completedAt: workout.updatedAt,
                exercises: workout.exercises,
              }
            : null,
        };
      })
    );

    res.json({ success: true, count: populated.length, members: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/members/available-pro
 * @desc    Get all PRO/PREMIUM members with no trainer assigned
 * @access  Private (Admin & Trainer)
 */
export const getAvailableProMembers = async (req, res) => {
  try {
    // Find members without an assigned trainer
    const unassignedMembers = await User.find({
      role: "member",
      $or: [{ trainerId: null }, { trainerId: { $exists: false } }],
    }).select("-password");

    // Filter only those with active PRO or PREMIUM membership
    const proMembers = [];
    for (const member of unassignedMembers) {
      const membership = await Membership.findOne({ userId: member._id }).sort({ createdAt: -1 });
      if (membership && membership.status === "active" && ["PRO", "PREMIUM"].includes(membership.plan)) {
        proMembers.push({
          ...member.toObject(),
          plan: membership.plan,
          membershipStatus: membership.status,
          membershipStartDate: membership.startDate,
        });
      }
    }

    res.json({ success: true, count: proMembers.length, members: proMembers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   POST /api/members/:id/assign-trainer
 * @desc    Assign trainer to member (Admin, Trainer claiming PRO member, or PRO Member self-assigning)
 * @access  Private
 */
export const assignTrainerToMember = async (req, res) => {
  try {
    const memberId = req.params.id;
    const { trainerId } = req.body;

    const member = await User.findById(memberId);
    if (!member || member.role !== "member") {
      return res.status(404).json({ success: false, message: "Gym member not found" });
    }

    // Role-specific authorization and validations:
    if (req.user.role === "trainer") {
      // Trainer claiming: target member must have NO trainer currently assigned
      if (member.trainerId) {
        return res.status(400).json({
          success: false,
          message: "This athlete already has an assigned trainer.",
        });
      }

      // Check if athlete is PRO
      const mem = await Membership.findOne({ userId: member._id }).sort({ createdAt: -1 });
      if (!mem || mem.status !== "active" || !["PRO", "PREMIUM"].includes(mem.plan)) {
        return res.status(403).json({
          success: false,
          message: "Only athletes with an active PRO or Premium membership can be added.",
        });
      }

      member.trainerId = req.user._id;
    } else if (req.user.role === "member") {
      // Member self-assigning: must be the same member
      if (req.user._id.toString() !== memberId) {
        return res.status(403).json({ success: false, message: "Not authorized to assign coach for another member" });
      }

      // Must be PRO or PREMIUM
      const mem = await Membership.findOne({ userId: member._id }).sort({ createdAt: -1 });
      if (!mem || mem.status !== "active" || !["PRO", "PREMIUM"].includes(mem.plan)) {
        return res.status(403).json({
          success: false,
          message: "A dedicated coach is a PRO feature. Please upgrade your membership to select a coach.",
        });
      }

      if (!trainerId) {
        return res.status(400).json({ success: false, message: "Please specify a valid trainer ID" });
      }

      const trainer = await User.findById(trainerId);
      if (!trainer || trainer.role !== "trainer") {
        return res.status(404).json({ success: false, message: "Selected trainer not found" });
      }

      member.trainerId = trainer._id;
    } else if (req.user.role === "admin") {
      // Admin can assign any valid trainer or unassign
      if (trainerId) {
        const trainer = await User.findById(trainerId);
        if (!trainer || trainer.role !== "trainer") {
          return res.status(404).json({ success: false, message: "Selected trainer not found" });
        }
        member.trainerId = trainer._id;
      } else {
        member.trainerId = null;
      }
    } else {
      return res.status(403).json({ success: false, message: "Unauthorized role" });
    }

    await member.save();
    const updatedMember = await User.findById(memberId)
      .select("-password")
      .populate("trainerId", "name email specialty experience phone");

    res.json({
      success: true,
      message: "Trainer assignment updated successfully",
      member: updatedMember,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   POST /api/members/:id/remove-trainer
 * @desc    Unassign trainer from member (Admin, Trainer for own athlete, or Member self-canceling)
 * @access  Private
 */
export const removeTrainerFromMember = async (req, res) => {
  try {
    const memberId = req.params.id;
    const member = await User.findById(memberId);

    if (!member || member.role !== "member") {
      return res.status(404).json({ success: false, message: "Gym member not found" });
    }

    // Role-based permissions
    if (req.user.role === "member" && req.user._id.toString() !== memberId) {
      return res.status(403).json({ success: false, message: "Not authorized to cancel another member's coach" });
    }

    if (req.user.role === "trainer") {
      if (!member.trainerId || member.trainerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: "This athlete is not assigned to your roster" });
      }
    }

    member.trainerId = null;
    await member.save();

    res.json({
      success: true,
      message: "Coach unassigned successfully",
      member: {
        _id: member._id,
        name: member.name,
        email: member.email,
        trainerId: null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/members/:id
 * @desc    Get single member details
 * @access  Private
 */
export const getMemberById = async (req, res) => {
  try {
    const member = await User.findById(req.params.id)
      .select("-password")
      .populate("trainerId", "name email specialty experience phone");
    if (!member) {
      return res.status(404).json({ success: false, message: "Member not found" });
    }

    const membership = await Membership.findOne({ userId: member._id }).sort({ createdAt: -1 });
    const workout = await Workout.findOne({ memberId: member._id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      member: {
        ...member.toObject(),
        membership: membership ? membership.plan : null,
        membershipStatus: membership ? membership.status : "none",
        workout: workout || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   PUT /api/members/:id
 * @desc    Update member profile (Admin or self)
 * @access  Private
 */
export const updateMember = async (req, res) => {
  try {
    const userToUpdate = await User.findById(req.params.id);
    if (!userToUpdate) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Only an Admin can change user roles
    if (req.body.role && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only an Administrator can change roles" });
    }

    // Safeguard: Cannot demote or change master admin role
    if (userToUpdate.isImmutableAdmin && req.body.role && req.body.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Action Forbidden: The Master Admin role cannot be changed.",
      });
    }

    const fieldsToUpdate = { ...req.body };
    delete fieldsToUpdate.password;
    delete fieldsToUpdate.isImmutableAdmin;

    const updated = await User.findByIdAndUpdate(req.params.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    }).select("-password");

    // Sync membership status in Membership collection if admin updated it
    if (req.body.membershipStatus && req.user.role === "admin") {
      let mem = await Membership.findOne({ userId: req.params.id }).sort({ createdAt: -1 });
      if (mem) {
        mem.status = req.body.membershipStatus;
        if (req.body.membershipStatus === "active") {
          mem.approvedBy = req.user._id;
          mem.startDate = new Date();
          mem.endDate = new Date("2027-03-20T23:59:59.000Z");
        }
        await mem.save();
      } else if (req.body.membershipStatus === "active") {
        await Membership.create({
          userId: req.params.id,
          plan: req.body.plan || "PRO",
          price: "₹1,999",
          paymentMethod: "cash",
          status: "active",
          startDate: new Date(),
          endDate: new Date("2027-03-20T23:59:59.000Z"),
          approvedBy: req.user._id,
        });
      }
    }

    res.json({ success: true, member: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   DELETE /api/members/:id
 * @desc    Delete member (Admin only)
 * @access  Private (Admin)
 */
export const deleteMember = async (req, res) => {
  try {
    const userToDelete = await User.findById(req.params.id);
    if (!userToDelete) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (userToDelete.isImmutableAdmin) {
      return res.status(403).json({
        success: false,
        message: "Action Forbidden: The Master Admin account is permanent and cannot be deleted.",
      });
    }

    await User.findByIdAndDelete(req.params.id);
    await Membership.deleteMany({ userId: req.params.id });
    await Workout.deleteMany({ memberId: req.params.id });

    res.json({ success: true, message: `Member ${userToDelete.name} removed successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
