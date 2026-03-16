require("dotenv").config();
const admin = require("./config/firebase");

async function checkRole() {
  const email = "denvertimlick@gmail.com";

  const user = await admin.auth().getUserByEmail(email);

  console.log("Custom claims:", user.customClaims);

  process.exit();
}

checkRole();