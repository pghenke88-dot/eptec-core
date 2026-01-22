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
    // Authorization header auslesen
    const header = String(req.headers.authorization || "");
    // Token im Bearer-Format extrahieren
    const match = header.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      return res.status(401).json({
        ok: false,
        code: "NO_AUTH",
        message: "Authorization header missing or invalid"
      });
    }

    const token = match[1];
    // JWT verifizieren und Payload extrahieren
    const payload = jwtVerify(token);

    // Überprüfen der erwarteten Payload-Struktur
    if (!payload?.sub || !payload?.username) {
      return res.status(401).json({
        ok: false,
        code: "BAD_TOKEN",
        message: "Token payload invalid"
      });
    }

    // Benutzerinformationen in req.user setzen
    req.user = {
      id: payload.sub,
      username: payload.username
    };

    // Weiterleiten an den nächsten Middleware-Handler
    return next();

  } catch (err) {
    return res.status(401).json({
      ok: false,
      code: "BAD_AUTH",
      message: "Authentication failed"
    });
  }
}
