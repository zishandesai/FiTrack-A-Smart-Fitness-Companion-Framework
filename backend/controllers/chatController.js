import Message from "../models/Message.js";
import User from "../models/User.js";

/**
 * @route   POST /api/chat/send
 * @desc    Send a message between Trainer and Member
 * @access  Private
 */
export const sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    if (!receiverId || !content || !content.trim()) {
      return res.status(400).json({ success: false, message: "Receiver ID and message content are required" });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ success: false, message: "Recipient user not found" });
    }

    const message = await Message.create({
      senderId: req.user._id,
      receiverId: receiver._id,
      senderName: req.user.name,
      senderRole: req.user.role,
      content: content.trim(),
    });

    res.status(201).json({ success: true, message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/chat/conversation/:partnerId
 * @desc    Get chat message history with a specific user
 * @access  Private
 */
export const getConversation = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const partnerId = req.params.partnerId;

    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId: partnerId },
        { senderId: partnerId, receiverId: currentUserId },
      ],
    }).sort({ createdAt: 1 });

    // Mark unread messages sent by partner as read
    await Message.updateMany(
      { senderId: partnerId, receiverId: currentUserId, read: false },
      { $set: { read: true } }
    );

    res.json({ success: true, count: messages.length, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/chat/contacts
 * @desc    Get relevant chat contacts (Assigned coach for members, assigned athletes for trainers)
 * @access  Private
 */
export const getChatContacts = async (req, res) => {
  try {
    const user = req.user;

    if (user.role === "member") {
      // Find assigned trainer
      const memberDoc = await User.findById(user._id).populate("trainerId", "name email phone specialty experience");
      const coach = memberDoc.trainerId;

      if (!coach) {
        return res.json({ success: true, contacts: [] });
      }

      // Find latest message snippet
      const lastMessage = await Message.findOne({
        $or: [
          { senderId: user._id, receiverId: coach._id },
          { senderId: coach._id, receiverId: user._id },
        ],
      }).sort({ createdAt: -1 });

      return res.json({
        success: true,
        contacts: [
          {
            _id: coach._id,
            name: coach.name,
            email: coach.email,
            role: "trainer",
            specialty: coach.specialty || "Fitness Coach",
            lastMessage: lastMessage ? lastMessage.content : "No messages yet. Say hello!",
            lastMessageTime: lastMessage ? lastMessage.createdAt : null,
          },
        ],
      });
    }

    if (user.role === "trainer") {
      // Find all athletes assigned to this trainer
      const athletes = await User.find({ trainerId: user._id }).select("name email phone goal");

      const contactsWithLatest = await Promise.all(
        athletes.map(async (ath) => {
          const lastMsg = await Message.findOne({
            $or: [
              { senderId: user._id, receiverId: ath._id },
              { senderId: ath._id, receiverId: user._id },
            ],
          }).sort({ createdAt: -1 });

          const unreadCount = await Message.countDocuments({
            senderId: ath._id,
            receiverId: user._id,
            read: false,
          });

          return {
            _id: ath._id,
            name: ath.name,
            email: ath.email,
            role: "member",
            goal: ath.goal,
            lastMessage: lastMsg ? lastMsg.content : "Ready to start training!",
            lastMessageTime: lastMsg ? lastMsg.createdAt : null,
            unreadCount,
          };
        })
      );

      return res.json({ success: true, contacts: contactsWithLatest });
    }

    // If admin
    const trainers = await User.find({ role: "trainer" }).select("name email specialty");
    res.json({ success: true, contacts: trainers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
