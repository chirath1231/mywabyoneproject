/**
 * POST /upload/image        — save image to local disk, return proxy URL
 * GET  /upload/image-proxy  — serve the image from local disk
 *
 * Registered in server.js as:  app.use("/api/upload", uploadRoutes);
 */

const fs       = require("fs");
const express  = require("express");
const multer   = require("multer");
const { v4: uuidv4 } = require("uuid");
const { MIME_BY_EXT, EXT_BY_MIME, isValidKey, keyToPath } = require("./fileStorage");
const { auth } = require("../middleware/auth");

const router = express.Router();

/* ── multer ─────────────────────────────────────────────────── */
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!EXT_BY_MIME[file.mimetype]) {
      return cb(new Error("Only JPG, PNG, GIF, WEBP, AVIF or BMP images are allowed"), false);
    }
    cb(null, true);
  },
});

/* ── POST /api/upload/image ─────────────────────────────────── */
router.post("/image", auth, (req, res) => {
  upload.single("image")(req, res, async (uploadErr) => {
    if (uploadErr) return res.status(400).json({ error: uploadErr.message });
    try {
      if (!req.file) return res.status(400).json({ error: "No image file provided" });

      const ext = EXT_BY_MIME[req.file.mimetype];
      const key = `products/${uuidv4()}.${ext}`;

      await fs.promises.writeFile(keyToPath(key), req.file.buffer);

      // Relative URL works on any domain (frontend + API share one origin on Dokploy).
      // Set API_BASE_URL only if the API lives on a different domain than the frontend.
      const base = (process.env.API_BASE_URL || "").replace(/\/$/, "");
      res.json({ url: `${base}/api/upload/image-proxy?key=${encodeURIComponent(key)}` });
    } catch (err) {
      console.error("Image upload error:", err);
      res.status(500).json({ error: "Failed to upload image", details: err.message });
    }
  });
});

/* ── GET /api/upload/image-proxy?key=products/xxx.jpg ──────── */
// Public (no auth) so storefront visitors can load images.
router.get("/image-proxy", (req, res) => {
  const { key } = req.query;
  if (!key) return res.status(400).send("Missing key");
  if (!isValidKey(key)) return res.status(403).send("Forbidden");

  const ext = key.split(".").pop();
  res.setHeader("Content-Type",  MIME_BY_EXT[ext] || "application/octet-stream");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.sendFile(keyToPath(key), (err) => {
    if (err && !res.headersSent) res.status(404).send("Image not found");
  });
});

module.exports = router;
