require("dotenv").config();
const admin = require("./config/firebase");

async function checkRole() {
  try {
    const email = "denvertimlick@gmail.com";

    const user = await admin.auth().getUserByEmail(email);

    console.log("Email:", user.email);
    console.log("UID:", user.uid);
    console.log("Custom claims:", user.customClaims || {});
    process.exit(0);
  } catch (err) {
    console.error("Failed to check role");
    console.error(err);
    process.exit(1);
  }
}

checkRole();