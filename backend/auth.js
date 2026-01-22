// scripts/auth_required.js
// EPTEC Auth Middleware – FINAL
// Zweck:
// - Schützt Backend-Routen
// - Erwartet Authorization: Bearer <JWT>
// - Setzt req.user für nachgelagerte Controller
// - Keine Seiteneffekte, kein State

import { jwtVerify } from "./security.js";

export function authRequired(req, res, next) {
  try {
    const header = String(req.headers.authorization || "");
    const match = header.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      return res.status(401).json({
        ok: false,
        code: "NO_AUTH",
        message: "Authorization header missing or invalid"
      });
    }

    const token = match[1];
    const payload = jwtVerify(token);

    // Erwartete Payload-Struktur:
    // {
    //   sub: userId,
    //   username: string,
    //   iat, exp, ...
    // }

    if (!payload?.sub || !payload?.username) {
      return res.status(401).json({
        ok: false,
        code: "BAD_TOKEN",
        message: "Token payload invalid"
      });
    }

    req.user = {
      id: payload.sub,
      username: payload.username
    };

    return next();

  } catch (err) {
    return res.status(401).json({
      ok: false,
      code: "BAD_AUTH",
      message: "Authentication failed"
    });
  }
}
