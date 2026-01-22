// backend/cors_policy.js
import cors from "cors";

export function corsPolicyFromEnv() {
  const originEnv = String(process.env.CORS_ORIGIN || "").trim();
  const allowed = new Set(
    originEnv ? originEnv.split(",").map(s => s.trim()).filter(Boolean) : []
  );

  const corsOptions = {
    origin: (origin, cb) => {
      // allow non-browser calls without Origin header (curl/health)
      if (!origin) return cb(null, true);
      if (allowed.has(origin)) return cb(null, true);
      return cb(null, false);
    },
    methods: ["GET", "POST,","OPTIONS"].join(" ").replaceAll(",", ""),
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
    maxAge: 86400
  };

  return [cors(corsOptions), cors(corsOptions)]; // second for options(*)
}
