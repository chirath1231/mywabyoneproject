/**
 * POST /upload/image        — upload to OCI, return proxied URL
 * GET  /upload/image-proxy  — stream OCI object to browser
 *
 * Registered in server.js as:  app.use("/api/upload", uploadRoutes);
 */

const express  = require("express");
const multer   = require("multer");
const { v4: uuidv4 } = require("uuid");
const { objectStorageClient, OCI_NAMESPACE, OCI_BUCKET } = require("./ociStorage");
const { auth } = require("../middleware/auth");

const router = express.Router();

/* ── multer ─────────────────────────────────────────────────── */
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Only image files are allowed"), false);
    cb(null, true);
  },
});

/* ── POST /api/upload/image ─────────────────────────────────── */
router.post("/image", auth, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image file provided" });

    const ext        = (req.file.originalname.split(".").pop() || "jpg").toLowerCase();
    const objectName = `products/${uuidv4()}.${ext}`;

    await objectStorageClient.putObject({
      namespaceName: OCI_NAMESPACE,
      bucketName:    OCI_BUCKET,
      objectName,
      putObjectBody: req.file.buffer,
      contentLength: req.file.size,
      contentType:   req.file.mimetype,
    });

    // Use a full absolute path that matches however your backend is mounted
    // Change the prefix below to match your app.use() mount path in server.js
    const proxyUrl = `/api/upload/image-proxy?key=${encodeURIComponent(objectName)}`;
    res.json({ url: proxyUrl });
  } catch (err) {
    console.error("OCI upload error:", err);
    res.status(500).json({ error: "Failed to upload image", details: err.message });
  }
});

/* ── GET /api/upload/image-proxy?key=products/xxx.jpg ──────── */
// No auth middleware — must be public so browsers/storefronts can load images
router.get("/image-proxy", async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).send("Missing key");

    // Basic safety: only serve objects inside the products/ folder
    if (!key.startsWith("products/")) return res.status(403).send("Forbidden");

    const response = await objectStorageClient.getObject({
      namespaceName: OCI_NAMESPACE,
      bucketName:    OCI_BUCKET,
      objectName:    key,
    });

    res.setHeader("Content-Type",  response.contentType || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    const body = response.value;

    // OCI SDK v2: body is a web ReadableStream — convert to Node stream
    if (body && typeof body.getReader === "function") {
      const { Readable } = require("stream");
      const reader = body.getReader();
      const nodeStream = new Readable({
        async read() {
          try {
            const { done, value } = await reader.read();
            if (done) { this.push(null); }
            else       { this.push(Buffer.from(value)); }
          } catch (e) {
            this.destroy(e);
          }
        },
      });
      nodeStream.pipe(res);

    // OCI SDK v1 / Node stream
    } else if (body && typeof body.pipe === "function") {
      body.pipe(res);

    // Fallback: buffer (Blob / Buffer / Uint8Array)
    } else if (body) {
      const buf = Buffer.isBuffer(body)
        ? body
        : Buffer.from(
            typeof body.arrayBuffer === "function"
              ? await body.arrayBuffer()
              : body,
          );
      res.end(buf);

    } else {
      res.status(404).send("Empty response from OCI");
    }
  } catch (err) {
    console.error("OCI proxy error:", err.message);
    res.status(404).send("Image not found");
  }
});

module.exports = router;