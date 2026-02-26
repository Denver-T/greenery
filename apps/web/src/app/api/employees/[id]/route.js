import { NextResponse } from "next/server";
import { getPool } from "@/app/lib/db";

function parseId(params) {
  const id = Number(params?.id);
  return Number.isFinite(id) ? id : null;
}

// PUT /api/employees/:id -> update employee
export async function PUT(req, { params }) {
  try {
    const id = parseId(params);
    if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

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
      `UPDATE employees
       SET name=?, role=?, email=?, phone=?, status=?, permissionLevel=?
       WHERE id=?`,
      [name, role, email, phone, status, permissionLevel, id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ id, name, role, email, phone, status, permissionLevel });
  } catch (err) {
    console.error("PUT /api/employees/:id error:", err);
    return NextResponse.json(
      { error: "Failed to update employee" },
      { status: 500 }
    );
  }
}

// DELETE /api/employees/:id -> delete employee
export async function DELETE(req, { params }) {
  try {
    const id = parseId(params);
    if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const pool = getPool();
    const [result] = await pool.query("DELETE FROM employees WHERE id=?", [id]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/employees/:id error:", err);
    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
}