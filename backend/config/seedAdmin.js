import User from "../models/User.js";

export const seedMasterAdmin = async () => {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@fittrack.com").replace(/['"]/g, "").toLowerCase().trim();
    const adminPassword = (process.env.ADMIN_PASSWORD || "Admin@12345").replace(/['"]/g, "").trim();
    const adminName = (process.env.ADMIN_NAME || "Gym Administrator").replace(/['"]/g, "").trim();

    // Check if master admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      console.log(`[FIT-TRACK Seed] Initializing Single Master Admin...`);
      const masterAdmin = new User({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        phone: "+91 99999 00000",
        role: "admin",
        isImmutableAdmin: true,
        goal: "General Fitness",
      });

      await masterAdmin.save();
      console.log(`[FIT-TRACK Seed] ✓ Master Admin seeded permanently:`);
      console.log(`                 Email:    ${adminEmail}`);
      console.log(`                 Password: ${adminPassword}`);
      console.log(`                 Status:   Permanent & Immutable (Cannot be deleted or demoted)`);
    } else {
      // Ensure immutable flag, name, and password sync with .env
      existingAdmin.name = adminName;
      existingAdmin.role = "admin";
      existingAdmin.isImmutableAdmin = true;
      existingAdmin.password = adminPassword;
      await existingAdmin.save();
      console.log(`[FIT-TRACK Seed] ✓ Master Admin verified & synchronized (${adminEmail})`);
    }

    const memberCount = await User.countDocuments({ role: "member" });
    const trainerCount = await User.countDocuments({ role: "trainer" });
    console.log(`[FIT-TRACK Status] Current DB Population: 1 Admin | ${trainerCount} Trainers | ${memberCount} Members`);
  } catch (error) {
    console.error(`[FIT-TRACK Seed Error] Failed to seed accounts:`, error.message);
  }
};
