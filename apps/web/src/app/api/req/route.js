/**
 * /api/req (POST)
 * ----------------
 * Purpose:
 *   Accept a Work Request (REQ) submission from the /req form.
 *   The form sends multipart/form-data (because it includes an optional image).
 *
 * What this handler does right now:
 *   - Parses multipart form data from the request.
 *   - Normalizes the data to a plain JS object (so the frontend / DB layer can consume it).
 *   - Returns a JSON response (mock "saved" message).
 *
 * What you (future dev) will likely add:
 *   - Validate the payload (e.g., using Zod/Yup) before saving.
 *   - Persist the data to a database (Prisma/SQL/Oracle/etc.).
 *   - Store the uploaded file (local disk, S3, Azure Blob, etc.) and save its URL/path.
 *   - Return the created record (id, timestamps, file URL).
 *
 * Notes:
 *   - This file uses the Next.js App Router convention: exporting an async POST() function.
 *   - Do NOT import body parsers (Next handles multipart for you via request.formData()).
 *   - Keep this a server-only module; do not add "use client".
 */

// If you want stricter control (e.g., max file size), consider a custom upload route or
// middleware. Next.js's built-in formData parsing is generally fine for small uploads.

/**
 * POST /api/req
 * Expects: multipart/form-data
 *   Form fields (from /req form):
 *     - referenceNumber (string)
 *     - date (string, "YYYY-MM-DD")
 *     - techName (string)
 *     - account (string)
 *     - accountContact (string)
 *     - accountAddress (string)
 *     - actionRequired (string)
 *     - numberOfPlants (string/number)
 *     - plantWanted (string)
 *     - plantReplaced (string)
 *     - plantSize (string; e.g., "3 Gal")
 *     - plantHeight (string; e.g., "Shorter than 2 feet")
 *     - planterTypeSize (string)
 *     - planterColour (string)
 *     - stagingMaterial (string)
 *     - lighting (string; "Low" | "Medium" | "High")
 *     - method (string)
 *     - location (string)
 *     - notes (string)
 *     - picture (File; optional)
 */
export async function POST(request) {
  try {
    // 1) Parse multipart/form-data (supports text fields + files)
    //    NOTE: request.json() will NOT work for multipart.
    const formData = await request.formData();

    // 2) Convert formData to a plain object.
    //    Files are File objects; for demonstration we only keep file.name.
    //    When you wire storage (e.g., S3), you'll read the file stream below.
    const raw = {};
    for (const [key, value] of formData.entries()) {
      // If it's a File, value is a File object (has .name, .size, .type, arrayBuffer(), etc.)
      if (typeof value === "object" && value !== null && "name" in value) {
        raw[key] = {
          fileName: value.name || null,
          // Optional: keep metadata if needed
          // mimeType: value.type || null,
          // fileSize: value.size ?? null,
        };
      } else {
        // Otherwise, it's a string
        raw[key] = value;
      }
    }

    // 3) Normalize + coerce types (example: numberOfPlants -> number)
    const payload = {
      referenceNumber: (raw.referenceNumber || "").trim(),
      date: (raw.date || "").trim(), // Consider converting to ISO later
      techName: (raw.techName || "").trim(),
      account: (raw.account || "").trim(),
      accountContact: (raw.accountContact || "").trim(),
      accountAddress: (raw.accountAddress || "").trim(),
      actionRequired: (raw.actionRequired || "").trim(),
      numberOfPlants:
        raw.numberOfPlants !== undefined && raw.numberOfPlants !== ""
          ? Number(raw.numberOfPlants)
          : null,
      plantWanted: (raw.plantWanted || "").trim(),
      plantReplaced: (raw.plantReplaced || "").trim(),
      plantSize: (raw.plantSize || "").trim(),
      plantHeight: (raw.plantHeight || "").trim(),
      planterTypeSize: (raw.planterTypeSize || "").trim(),
      planterColour: (raw.planterColour || "").trim(),
      stagingMaterial: (raw.stagingMaterial || "").trim(),
      lighting: (raw.lighting || "").trim(), // e.g., "Low" | "Medium" | "High"
      method: (raw.method || "").trim(),
      location: (raw.location || "").trim(),
      notes: (raw.notes || "").trim(),
      // Picture metadata only—for real storage, read the File and upload.
      picture: raw.picture?.fileName ? { name: raw.picture.fileName } : null,
    };

    // 4) (Optional) Validate the payload before moving on.
    //    Replace with a schema validator of your choice (Zod shown below).
    //
    // import { z } from "zod";
    // const ReqSchema = z.object({
    //   referenceNumber: z.string().min(1),
    //   date: z.string().min(1), // or refine to match YYYY-MM-DD
    //   techName: z.string().min(1),
    //   account: z.string().min(1),
    //   numberOfPlants: z.number().nullable().optional(),
    //   // ... add the rest, with enums where appropriate
    // });
    // const parsed = ReqSchema.safeParse(payload);
    // if (!parsed.success) {
    //   return Response.json(
    //     { ok: false, error: "Validation failed", details: parsed.error.flatten() },
    //     { status: 400 }
    //   );
    // }
    // const dataToSave = parsed.data;

    // For now, treat `payload` as validated data.
    const dataToSave = payload;

    // 5) (Optional) File handling (uncomment to actually read / upload the file)
    //
    // if (formData.has("picture")) {
    //   const file = formData.get("picture"); // File object
    //   if (file && typeof file === "object" && "arrayBuffer" in file) {
    //     const bytes = await file.arrayBuffer(); // Buffer the file in memory
    //     const buffer = Buffer.from(bytes);
    //
    //     // Example A: Save to local disk (development only)
    //     // import { writeFile } from "node:fs/promises";
    //     // const targetPath = `./public/uploads/${Date.now()}_${file.name}`;
    //     // await writeFile(targetPath, buffer);
    //     // dataToSave.pictureUrl = targetPath.replace("./public", "");
    //
    //     // Example B: Upload to S3
    //     //   - Initialize an S3 client (e.g., @aws-sdk/client-s3)
    //     //   - PutObject with buffer, ContentType = file.type
    //     //   - Save the returned URL/key to dataToSave.pictureUrl
    //   }
    // }

    // 6) Persist to the database (Replace this mock with your real data layer)
    //
    // Example with Prisma:
    //   const created = await prisma.request.create({ data: dataToSave });
    //
    // Example with Oracle:
    //   - Use your Oracle driver to INSERT into a REQ table.
    //   - Map columns to the fields in `dataToSave`.
    //   - Return the inserted record (id, timestamp).
    //
    // For now, return a mocked "created" object with a generated id.
    const created = {
      id: `req_${Date.now()}`, // mock id; replace with DB-generated id
      ...dataToSave,
      createdAt: new Date().toISOString(),
    };

    // 7) Return a consistent API shape that frontends can rely on.
    return Response.json(
      {
        ok: true,
        message: "REQ saved (mock). Replace with real DB insert.",
        data: created,
      },
      { status: 200 }
    );
  } catch (err) {
    // 8) Catch-all error handling.
    //    In production, consider logging to an error service (Sentry, etc.).
    const message =
      (err && (err.message || err.toString())) || "Unknown server error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * (Optional) CORS preflight handler:
 * If this route will be called from another origin (e.g., mobile app or external system),
 * you may need to support OPTIONS requests and return proper CORS headers.
 *
 * export async function OPTIONS() {
 *   return new Response(null, {
 *     status: 204,
 *     headers: {
 *       "Access-Control-Allow-Origin": "*",
 *       "Access-Control-Allow-Methods": "POST, OPTIONS",
 *       "Access-Control-Allow-Headers": "Content-Type, Authorization",
 *       "Access-Control-Max-Age": "86400",
 *     },
 *   });
 * }
 */