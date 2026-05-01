import express from "express";
import pg from "pg";

const { Pool } = pg;

function requiredEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const PORT = Number(process.env.PORT ?? "8080");
const DATABASE_URL = process.env.DATABASE_URL;

const pool = DATABASE_URL ? new Pool({ connectionString: DATABASE_URL }) : null;

const app = express();
app.use(express.json({ limit: "256kb" }));

app.get("/healthz", async (_req, res) => {
  try {
    if (!pool) return res.status(503).json({ ok: false, db: "not-configured" });
    await pool.query("select 1 as ok");
    return res.json({ ok: true });
  } catch (e) {
    return res.status(503).json({ ok: false, error: String(e?.message ?? e) });
  }
});

app.post("/api/leads", async (req, res) => {
  try {
    if (!pool) return res.status(503).json({ ok: false, error: "db not configured" });

    const name = String(req.body?.name ?? "").trim();
    const email = String(req.body?.email ?? "").trim();
    const message = String(req.body?.message ?? "").trim();

    if (!email) return res.status(400).json({ ok: false, error: "email is required" });
    if (email.length > 254 || name.length > 120 || message.length > 4000) {
      return res.status(400).json({ ok: false, error: "input too long" });
    }

    await pool.query(
      "insert into leads (name, email, message) values ($1, $2, $3)",
      [name || null, email, message || null],
    );

    return res.status(201).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`greenops-backend listening on :${PORT}`);
});

