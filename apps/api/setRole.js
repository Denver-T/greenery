require("dotenv").config();

const admin = require("./config/firebase");

async function setRole() {
  try {
    const email = "denvertimlick@gmail.com";

    const user = await admin.auth().getUserByEmail(email);

    await admin.auth().setCustomUserClaims(user.uid, {
      role: "admin"
    });

    console.log("Role assigned successfully");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

setRole();