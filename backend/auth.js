import { jwtVerify } from "./security.js";

export function authRequired(req, res, next) {
  try {
    const hdr = String(req.headers.authorization || "");
    const m = hdr.match(/^Bearer\s+(.+)$/i);
    if (!m) return res.status(401).json({ ok: false, code: "NO_AUTH" });

    const payload = jwtVerify(m[1]);
    req.user = { id: payload.sub, username: payload.username };
    return next();
  } catch {
    return res.status(401).json({ ok: false, code: "BAD_AUTH" });
  }
}
