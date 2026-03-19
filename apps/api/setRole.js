require("dotenv").config();
const admin = require("./config/firebase");
const db = require("./config/db");

const VALID_ROLES = ["admin", "manager", "technician"];

const ROLE_MAP = {
  admin: "Administrator",
  manager: "Manager",
  technician: "Technician",
};

function buildDefaultName(email) {
  const localPart = email.split("@")[0] || "User";
  return localPart
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function setRole() {
  try {
    const email = process.argv[2]?.trim().toLowerCase();
    const role = process.argv[3]?.trim().toLowerCase();

    if (!email || !role) {
      throw new Error("Usage: node setRole.js <email> <role>");
    }

    if (!VALID_ROLES.includes(role)) {
      throw new Error(`Invalid role. Use one of: ${VALID_ROLES.join(", ")}`);
    }

    // Firebase update
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { role });

    const dbRole = ROLE_MAP[role];

    // Check if employee exists
    const [rows] = await db.query(
      `SELECT id FROM employees WHERE LOWER(email) = ? LIMIT 1`,
      [email]
    );

    if (rows.length === 0) {
      const displayName =
        (user.displayName && user.displayName.trim()) ||
        buildDefaultName(email);

      await db.query(
        `
        INSERT INTO employees (
          name,
          role,
          email,
          phone,
          status,
          permissionLevel
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [displayName, dbRole, email, null, "Active", dbRole]
      );

      console.log(`Created new employee for ${email}`);
    } else {
      await db.query(
        `
        UPDATE employees
        SET role = ?, permissionLevel = ?, status = 'Active'
        WHERE LOWER(email) = ?
        `,
        [dbRole, dbRole, email]
      );

      console.log(`Updated employee for ${email}`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
}

setRole();