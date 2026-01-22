// backend/security_headers.js
import helmet from "helmet";

export function securityHeaders({ publicOrigin, isProd }) {
  // minimal-strict CSP for API server (no scripts served)
  const csp = {
    directives: {
      defaultSrc: ["'none'"],
      connectSrc: ["'self'"], // API server only
      imgSrc: ["'none'"],
      styleSrc: ["'none'"],
      scriptSrc: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'self'"], // needed for /api/reset HTML form POST
      frameAncestors: ["'none'"]
    }
  };

  return [
    // Helmet baseline
    helmet({
      contentSecurityPolicy: csp,
      crossOriginEmbedderPolicy: false, // API server usually doesn't need COEP/COOP
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginResourcePolicy: { policy: "same-site" },
      referrerPolicy: { policy: "no-referrer" }
    }),

    // HSTS (only on HTTPS + production)
    (req, res, next) => {
      if (isProd && req.secure) {
        res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
      }
      next();
    },

    // Permissions-Policy: lock down powerful APIs by default
    (req, res, next) => {
      res.setHeader(
        "Permissions-Policy",
        [
          "camera=()",
          "microphone=()",
          "geolocation=()",
          "payment=()",
          "usb=()",
          "serial=()",
          "bluetooth=()",
          "clipboard-read=()",
          "clipboard-write=()"
        ].join(", ")
      );
      next();
    }
  ];
}
