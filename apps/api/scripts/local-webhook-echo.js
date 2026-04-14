// Throwaway webhook echo server for Phase 4.2.0.
//
// Run with:  node scripts/local-webhook-echo.js
//
// Listens on PORT (default 3099) — don't collide with the main API on 3001.
// Two behaviors:
//   1. If the incoming POST body has a `challenge` field, respond 200 with
//      {challenge: <same value>}. This is Monday's registration handshake.
//   2. Otherwise, log the full request (headers + body) to stdout and
//      respond 200 OK. Copy the stdout output to capture real event payloads.
//
// Expose this locally-bound server to the public internet with:
//   cloudflared tunnel --url http://localhost:3099
// ...in a second terminal. Cloudflared prints a *.trycloudflare.com URL;
// put that into .env as MONDAY_WEBHOOK_CAPTURE_URL.

const express = require("express");

const app = express();
const PORT = process.env.PORT || 3099;

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

app.post(/.*/, (req, res) => {
  const now = new Date().toISOString();

  // Monday's registration challenge probe.
  if (req.body && typeof req.body.challenge !== "undefined") {
    console.log(`[${now}] CHALLENGE received — echoing`);
    console.log("  challenge:", req.body.challenge);
    return res.status(200).json({ challenge: req.body.challenge });
  }

  // Real webhook event — log everything so we can capture the shape.
  console.log("\n================================================================");
  console.log(`[${now}] WEBHOOK EVENT`);
  console.log("================================================================");
  console.log("URL:   ", req.originalUrl);
  console.log("\n--- HEADERS ---");
  console.log(JSON.stringify(req.headers, null, 2));
  console.log("\n--- BODY ---");
  console.log(JSON.stringify(req.body, null, 2));
  console.log("================================================================\n");

  return res.status(200).json({ ok: true });
});

// Health check so you can curl / visit in a browser to confirm it's up.
app.get("/", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "local-webhook-echo",
    port: PORT,
    note: "POST to this endpoint to capture events. Challenges are auto-echoed.",
  });
});

app.listen(PORT, () => {
  console.log(`\n🧲 local-webhook-echo listening on http://localhost:${PORT}`);
  console.log(`   GET  /   → health check`);
  console.log(`   POST any path → echo challenges, log events`);
  console.log(`\nNext step: in a second terminal, run`);
  console.log(`   cloudflared tunnel --url http://localhost:${PORT}`);
  console.log(`and copy the *.trycloudflare.com URL into .env as MONDAY_WEBHOOK_CAPTURE_URL.\n`);
});
