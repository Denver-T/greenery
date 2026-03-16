require("dotenv").config();
const admin = require("./config/firebase");

async function setRole() {
  try {
    const email = process.argv[2];
    const role = process.argv[3];

    if (!email || !role) {
      throw new Error("Usage: node setRole.js <email> <role>");
    }

    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { role });

    console.log(`Role '${role}' assigned to ${email}`);
    process.exit(0);
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
}

setRole();