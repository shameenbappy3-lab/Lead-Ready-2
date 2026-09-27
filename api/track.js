// api/track.js
//
// Phase 2: events are now persisted to Supabase (table:
// tracking_events). Still no lead-validation check against a
// leads table — that's the next hardening step, along with an
// IP/ASN lookup to flag datacenter traffic. For now, anyone who
// knows this endpoint's shape could still POST arbitrary events;
// low stakes for now since this table isn't wired to anything
// that acts automatically on the data yet.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body;
  try {
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

  // Vercel puts the real visitor IP first in x-forwarded-for; any
  // entries after that are proxies/CDNs in between. Captured now so
  // it's available later even though nothing filters on it yet —
  // bot detection currently lives in Supabase views based on event
  // timing instead (see suspicious_tracking_ids / tracking_summary).
  const forwardedFor = req.headers["x-forwarded-for"];
  const ip =
    (typeof forwardedFor === "string"
      ? forwardedFor.split(",")[0].trim()
      : null) ||
    req.socket?.remoteAddress ||
    null;
  const userAgent = req.headers["user-agent"] || null;

  // Vercel's edge network tags every request with the visitor's
  // approximate location before it reaches this function — free,
  // no third-party lookup needed. Empty when testing with
  // `vercel dev` locally; only populated on real deployed traffic.
  const country = req.headers["x-vercel-ip-country"] || null;
  const region = req.headers["x-vercel-ip-country-region"] || null;
  const city = req.headers["x-vercel-ip-city"] || null;

  // Still logged too — cheap to keep, and useful for a live
  // sanity check within Vercel's 1-hour log window.
  console.log("[track]", {
    trackingId,
    sessionId,
    event,
    timestamp,
    ip,
    city,
    country,
  });

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error(
      "[track] SUPABASE_URL or SUPABASE_KEY not set — event not persisted"
    );
    // Still respond success to the browser; this is our
    // infrastructure problem, not the visitor's.
    res.status(204).end();
    return;
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/tracking_events`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          // Skip getting the inserted row back — we don't need it.
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          tracking_id: trackingId,
          session_id: sessionId || null,
          event,
          event_timestamp: timestamp || null,
          initial_state: initialState || null,
          data: data || null,
          ip_address: ip,
          user_agent: userAgent,
          country,
          region,
          city,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("[track] Supabase insert failed:", response.status, errText);
    }
  } catch (err) {
    console.error("[track] Supabase request threw:", err.message);
  }

  res.status(204).end();
};