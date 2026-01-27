/**
 * scripts/security_vault.js
 * EPTEC SECURITY VAULT — FINAL (WebCrypto AES-GCM)
 * - Browser-native SubtleCrypto
 * - AES-256-GCM (confidentiality + integrity)
 * - No hardcoded secrets
 *
 * Key management:
 * - In Phase 1: derive key from user secret (e.g. password) via PBKDF2
 * - In Phase 2: use server-provided wrapped keys
 */

(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch { return undefined; } };
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  function b64(bytes) {
    let s = "";
    bytes.forEach(b => s += String.fromCharCode(b));
    return btoa(s);
  }
  function unb64(str) {
    const s = atob(str);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  async function deriveKeyFromPassphrase(passphrase, saltBytes) {
    const passKey = await crypto.subtle.importKey(
      "raw",
      enc.encode(String(passphrase || "")),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: saltBytes,
        iterations: 200000,
        hash: "SHA-256"
      },
      passKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function encryptBytes(bytes, passphrase) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv   = crypto.getRandomValues(new Uint8Array(12)); // GCM standard
    const key  = await deriveKeyFromPassphrase(passphrase, salt);

    const cipherBuf = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      bytes
    );

    return {
      ok: true,
      alg: "AES-256-GCM",
      salt: b64(salt),
      iv: b64(iv),
      data: b64(new Uint8Array(cipherBuf))
    };
  }

  async function decryptBytes(payload, passphrase) {
    const salt = unb64(payload.salt);
    const iv   = unb64(payload.iv);
    const data = unb64(payload.data);

    const key = await deriveKeyFromPassphrase(passphrase, salt);
    const plainBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );

    return new Uint8Array(plainBuf);
  }

  // Public API
  const Vault = {
    // Encrypt a File/Blob → encrypted package (base64)
    encryptFile: async (file, passphrase) => {
      if (!file) return { ok: false, reason: "NO_FILE" };
      const buf = new Uint8Array(await file.arrayBuffer());
      return encryptBytes(buf, passphrase);
    },

    // Decrypt package → Uint8Array (original bytes)
    decryptToBytes: async (pkg, passphrase) => {
      try {
        const bytes = await decryptBytes(pkg, passphrase);
        return { ok: true, bytes };
      } catch {
        return { ok: false, reason: "DECRYPT_FAILED" };
      }
    },

    // Convenience: decrypt package → string (for text docs)
    decryptToText: async (pkg, passphrase) => {
      const r = await Vault.decryptToBytes(pkg, passphrase);
      if (!r.ok) return r;
      return { ok: true, text: dec.decode(r.bytes) };
    }
  };

  window.SecurityVault = window.SecurityVault || Vault;
})();


