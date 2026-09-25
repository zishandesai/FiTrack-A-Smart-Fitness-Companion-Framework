import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "fittrack_secret_key_default");

      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ success: false, message: "User belonging to token no longer exists" });
      }

      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: "Not authorized, token failed or expired" });
    }
  } else {
    return res.status(401).json({ success: false, message: "Not authorized, no bearer token provided" });
  }
};

export const optionalProtect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "fittrack_secret_key_default");
      req.user = await User.findById(decoded.id).select("-password");
    } catch {
      // Continue without user if token is invalid
      req.user = null;
    }
  }
  next();
};
