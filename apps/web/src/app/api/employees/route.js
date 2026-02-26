import { NextResponse } from "next/server";
import { getPool } from "@/app/lib/db";

// GET /api/employees  -> list all employees
export async function GET() {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      "SELECT id, name, role, email, phone, status, permissionLevel FROM employees ORDER BY id DESC"
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error("GET /api/employees error:", err);
    return NextResponse.json(
      { error: "Failed to load employees" },
      { status: 500 }
    );
  }
}

// POST /api/employees -> create employee
export async function POST(req) {
  try {
    const body = await req.json();

    const name = (body.name || "").trim();
    const role = body.role || "Technician";
    const email = body.email || null;
    const phone = body.phone || null;
    const status = body.status || "Active";
    const permissionLevel = body.permissionLevel || role;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const pool = getPool();
    const [result] = await pool.query(
      `INSERT INTO employees (name, role, email, phone, status, permissionLevel)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, role, email, phone, status, permissionLevel]
    );

    return NextResponse.json(
      { id: result.insertId, name, role, email, phone, status, permissionLevel },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/employees error:", err);
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
}