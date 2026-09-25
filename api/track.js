// api/track.js
//
// Phase 1 (this file): receive events from script.js, validate
// the shape, and log them so you can confirm they're arriving
// correctly. Nothing is persisted yet.
//
// Phase 2 (not yet built): before accepting an event, look up
// trackingId in a `leads` table (Supabase) and reject anything
// that doesn't match a lead you actually sent to — that's your
// main defense against someone scripting requests directly at
// this endpoint. Once that table exists, write each event there
// instead of just logging it. Also add an IP/ASN check at that
// point (e.g. via ipinfo.io's free tier) to flag datacenter/cloud
// IPs as likely scanners, in addition to the behavioral signals
// script.js already sends (0 scroll, 0 clicks, near-instant exit).

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body;
  try {
    // sendBeacon delivers a Blob whose body Vercel may hand you
    // as a raw string depending on content-type parsing, so
    // handle both cases.
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch (err) {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  const { trackingId, sessionId, event, timestamp, initialState, data } =
    body || {};

  if (!trackingId || !event) {
    res.status(400).json({ error: "Missing trackingId or event" });
    return;
  }

  // Visible in `vercel logs` / the Vercel dashboard's Function
  // Logs tab. This is your Phase 1 verification step: send a
  // real tracked email or open the link yourself with ?c=test123
  // and confirm events show up here before building the database.
  console.log("[track]", {
    trackingId,
    sessionId,
    event,
    timestamp,
    initialState,
    data,
  });

  res.status(204).end();
};