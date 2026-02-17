/**
 * One-time backfill script: populate `username` on existing TaskMember documents
 * that were created before the username field was added to the schema.
 *
 * Run from the project root:
 *   node backend/scripts/backfill-usernames.js
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from the backend root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import mongoose from "mongoose";
import { User } from "../src/models/user.model.js";
import { TaskMember } from "../src/models/projectmember.models.js";

async function backfill() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Find all TaskMember docs with missing or empty username
  const stale = await TaskMember.find({
    $or: [{ username: { $exists: false } }, { username: "" }],
  });

  console.log(`Found ${stale.length} TaskMember record(s) to backfill`);

  let updated = 0;
  let skipped = 0;

  for (const member of stale) {
    const user = await User.findById(member.user).select("username");
    if (user?.username) {
      await TaskMember.findByIdAndUpdate(member._id, {
        username: user.username,
      });
      updated++;
    } else {
      console.warn(`  Skipped TaskMember ${member._id} — user not found`);
      skipped++;
    }
  }

  console.log(`Backfill complete: ${updated} updated, ${skipped} skipped`);
  await mongoose.disconnect();
}

backfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
