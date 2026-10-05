import mongoose from "mongoose";
import dns from "dns";

// Fix for Windows / ISP / College WiFi DNS resolvers that refuse or block MongoDB SRV queries (querySrv ECONNREFUSED)
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (err) {
  console.warn("[FIT-TRACK Database] Custom DNS set warning:", err.message);
}

let isConnected = false;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/fittrack";

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    });

    isConnected = true;
    console.log(`[FIT-TRACK Database] MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    isConnected = false;
    const sanitizedUri = uri.replace(/:([^:@]+)@/, ":****@");
    console.warn(`[FIT-TRACK Database Warning] Could not connect to MongoDB at: ${sanitizedUri}`);
    console.warn(`[FIT-TRACK Database Warning] Details: ${error.message}`);
    console.warn(`[FIT-TRACK Database Warning] Tip: If using MongoDB Atlas, verify your IP is allowed in MongoDB Atlas Network Access (0.0.0.0/0).`);
    return false;
  }
};

export const getDBStatus = () => isConnected;
