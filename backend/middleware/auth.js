const jwt = require("jsonwebtoken");
const { query: db } = require("../config/db");

async function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // Allow client to override per-request via header
    const headerWs = req.headers["x-workspace-id"];
    if (headerWs) {
      req.user.workspaceId = headerWs;
    } else {
      // Look up the user's current workspace
      try {
        const r = await db(
          `SELECT current_workspace_id FROM wabyone_org_members
           WHERE user_id = $1 AND org_id = $2 LIMIT 1`,
          [decoded.userId, decoded.orgId],
        );
        req.user.workspaceId = r.rows[0]?.current_workspace_id || null;
      } catch {
        req.user.workspaceId = null;
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

function orgAccess(req, res, next) {
  const orgId = req.params.orgId || req.body.org_id || req.query.org_id;
  if (!orgId) {
    return res.status(400).json({ error: "Organization ID required." });
  }
  req.orgId = orgId;
  next();
}

module.exports = { auth, orgAccess };
