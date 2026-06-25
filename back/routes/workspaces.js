const express = require("express");
const { query: db } = require("../config/db");
const { auth } = require("../middleware/auth");
const { getPreset } = require("../config/industryPresets");
const { getLimit, PLAN_LIMITS } = require("../config/planLimits");

const router = express.Router();

// List workspaces for current org + plan info
router.get("/", auth, async (req, res) => {
  try {
    const wsResult = await db(
      `SELECT id, name, industry, icon, theme_config, terminology,
              dashboard_config, feature_flags, is_default, created_at
       FROM wabyone_workspaces WHERE org_id = $1 ORDER BY is_default DESC, created_at ASC`,
      [req.user.orgId],
    );
    const orgResult = await db(
      `SELECT plan_tier FROM wabyone_organizations WHERE id = $1`,
      [req.user.orgId],
    );
    const memberResult = await db(
      `SELECT current_workspace_id FROM wabyone_org_members WHERE user_id = $1 AND org_id = $2`,
      [req.user.userId, req.user.orgId],
    );

    const tier = orgResult.rows[0]?.plan_tier || "free";
    const limit = getLimit(tier);

    res.json({
      workspaces: wsResult.rows,
      current_workspace_id: memberResult.rows[0]?.current_workspace_id || null,
      plan: {
        tier,
        label: limit.label,
        workspace_limit:
          limit.workspaces === Infinity ? null : limit.workspaces,
        workspace_count: wsResult.rows.length,
      },
    });
  } catch (err) {
    console.error("List workspaces error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Create a new workspace (with optional industry preset)
router.post("/", auth, async (req, res) => {
  const { name, preset_key, industry, make_active = true } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });

  try {
    // Plan limit check
    const orgResult = await db(
      `SELECT plan_tier FROM wabyone_organizations WHERE id = $1`,
      [req.user.orgId],
    );
    const tier = orgResult.rows[0]?.plan_tier || "free";
    const limit = getLimit(tier);

    const countResult = await db(
      `SELECT COUNT(*)::int as c FROM wabyone_workspaces WHERE org_id = $1`,
      [req.user.orgId],
    );
    const count = countResult.rows[0]?.c || 0;
    if (count >= limit.workspaces) {
      return res.status(403).json({
        error: "PLAN_LIMIT_REACHED",
        message: `Your ${limit.label} plan allows ${limit.workspaces} workspace${limit.workspaces === 1 ? "" : "s"}. Upgrade to add more industries.`,
        plan: { tier, label: limit.label, workspace_limit: limit.workspaces },
      });
    }

    // Resolve preset
    const preset = preset_key ? getPreset(preset_key) : null;
    const ind = preset_key || industry || "general";
    const theme = preset?.theme || {};
    const terms = preset?.terminology || {};
    const dash = { widgets: preset?.dashboard_widgets || [] };
    const flags = preset?.feature_flags || {};
    const icon = preset?.icon || "🏢";

    const wsResult = await db(
      `INSERT INTO wabyone_workspaces
        (org_id, name, industry, icon, theme_config, terminology, dashboard_config, feature_flags, is_default)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9)
       RETURNING *`,
      [
        req.user.orgId,
        name,
        ind,
        icon,
        JSON.stringify(theme),
        JSON.stringify(terms),
        JSON.stringify(dash),
        JSON.stringify(flags),
        count === 0,
      ],
    );
    const workspace = wsResult.rows[0];

    // Seed categories + custom fields for this workspace
    if (preset) {
      for (const cat of preset.categories || []) {
        await db(
          `INSERT INTO wabyone_categories (org_id, workspace_id, name, type, color)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            req.user.orgId,
            workspace.id,
            cat.name,
            cat.type || "product",
            cat.color || null,
          ],
        );
      }
      for (const f of preset.custom_fields || []) {
        await db(
          `INSERT INTO wabyone_custom_fields
           (org_id, workspace_id, entity_type, field_name, field_label, field_type, options, is_required)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            req.user.orgId,
            workspace.id,
            f.entity_type,
            f.field_name,
            f.field_label,
            f.field_type || "text",
            JSON.stringify(f.options || []),
            !!f.is_required,
          ],
        );
      }
    }

    if (make_active) {
      await db(
        `UPDATE wabyone_org_members SET current_workspace_id = $1
         WHERE user_id = $2 AND org_id = $3`,
        [workspace.id, req.user.userId, req.user.orgId],
      );
    }

    res.status(201).json({ workspace });
  } catch (err) {
    console.error("Create workspace error:", err.message, err.stack);
    res
      .status(500)
      .json({ error: "Failed to create workspace", details: err.message });
  }
});

// Switch active workspace
router.post("/:id/switch", auth, async (req, res) => {
  try {
    const wsResult = await db(
      `SELECT id FROM wabyone_workspaces WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.user.orgId],
    );
    if (wsResult.rows.length === 0)
      return res.status(404).json({ error: "Workspace not found" });

    await db(
      `UPDATE wabyone_org_members SET current_workspace_id = $1
       WHERE user_id = $2 AND org_id = $3`,
      [req.params.id, req.user.userId, req.user.orgId],
    );
    res.json({ success: true, workspace_id: req.params.id });
  } catch (err) {
    console.error("Switch workspace error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Update workspace (rename / change preset)
router.put("/:id", auth, async (req, res) => {
  const { name, preset_key } = req.body;
  try {
    let theme = null,
      terms = null,
      dash = null,
      flags = null,
      ind = null,
      icon = null;
    if (preset_key) {
      const preset = getPreset(preset_key);
      if (!preset) return res.status(400).json({ error: "Invalid preset key" });
      theme = JSON.stringify(preset.theme || {});
      terms = JSON.stringify(preset.terminology || {});
      dash = JSON.stringify({ widgets: preset.dashboard_widgets || [] });
      flags = JSON.stringify(preset.feature_flags || {});
      ind = preset_key;
      icon = preset.icon;
    }

    const result = await db(
      `UPDATE wabyone_workspaces SET
         name = COALESCE($1, name),
         industry = COALESCE($2, industry),
         icon = COALESCE($3, icon),
         theme_config = COALESCE($4::jsonb, theme_config),
         terminology = COALESCE($5::jsonb, terminology),
         dashboard_config = COALESCE($6::jsonb, dashboard_config),
         feature_flags = COALESCE($7::jsonb, feature_flags),
         updated_at = NOW()
       WHERE id = $8 AND org_id = $9 RETURNING *`,
      [
        name || null,
        ind,
        icon,
        theme,
        terms,
        dash,
        flags,
        req.params.id,
        req.user.orgId,
      ],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Workspace not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update workspace error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete workspace (cannot delete the last/default one)
router.delete("/:id", auth, async (req, res) => {
  try {
    const countResult = await db(
      `SELECT COUNT(*)::int as c FROM wabyone_workspaces WHERE org_id = $1`,
      [req.user.orgId],
    );
    if (countResult.rows[0].c <= 1)
      return res
        .status(400)
        .json({ error: "Cannot delete your only workspace" });

    const wsResult = await db(
      `SELECT is_default FROM wabyone_workspaces WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.user.orgId],
    );
    if (wsResult.rows.length === 0)
      return res.status(404).json({ error: "Workspace not found" });

    await db(`DELETE FROM wabyone_workspaces WHERE id = $1 AND org_id = $2`, [
      req.params.id,
      req.user.orgId,
    ]);

    // If deleted was default, promote another to default
    if (wsResult.rows[0].is_default) {
      await db(
        `UPDATE wabyone_workspaces SET is_default = true
         WHERE id = (SELECT id FROM wabyone_workspaces WHERE org_id = $1 ORDER BY created_at ASC LIMIT 1)`,
        [req.user.orgId],
      );
    }

    // Move users on this workspace to the default
    await db(
      `UPDATE wabyone_org_members SET current_workspace_id =
         (SELECT id FROM wabyone_workspaces WHERE org_id = $1 AND is_default = true LIMIT 1)
       WHERE org_id = $1 AND current_workspace_id IS NULL`,
      [req.user.orgId],
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Delete workspace error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Plan info
router.get("/plan", auth, async (req, res) => {
  try {
    const orgResult = await db(
      `SELECT plan_tier FROM wabyone_organizations WHERE id = $1`,
      [req.user.orgId],
    );
    const tier = orgResult.rows[0]?.plan_tier || "free";
    const limit = getLimit(tier);
    res.json({
      tier,
      label: limit.label,
      workspace_limit: limit.workspaces === Infinity ? null : limit.workspaces,
      all_tiers: Object.entries(PLAN_LIMITS).map(([key, v]) => ({
        tier: key,
        label: v.label,
        workspace_limit: v.workspaces === Infinity ? null : v.workspaces,
      })),
    });
  } catch (err) {
    console.error("Plan info error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Upgrade plan tier (dev/admin only — in production this would integrate with billing)
router.post("/plan/upgrade", auth, async (req, res) => {
  const { tier } = req.body;
  if (!PLAN_LIMITS[tier])
    return res.status(400).json({ error: "Invalid tier" });
  try {
    await db(
      `UPDATE wabyone_organizations SET plan_tier = $1, updated_at = NOW() WHERE id = $2`,
      [tier, req.user.orgId],
    );
    res.json({ success: true, tier });
  } catch (err) {
    console.error("Upgrade plan error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
