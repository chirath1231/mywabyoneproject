const express = require("express");
const { query: db } = require("../config/db");
const { auth } = require("../middleware/auth");
const { listPresets, getPreset } = require("../config/industryPresets");

const router = express.Router();

// List all available industry presets
router.get("/presets", (req, res) => {
  res.json({ presets: listPresets() });
});

// Get details of a single preset
router.get("/presets/:key", (req, res) => {
  const preset = getPreset(req.params.key);
  if (!preset) return res.status(404).json({ error: "Preset not found" });
  res.json(preset);
});

// Get current onboarding status for user's org
router.get("/status", auth, async (req, res) => {
  try {
    const result = await db(
      `SELECT industry, sub_industry, business_size, primary_goal, team_size,
              onboarding_completed, tour_completed, preset_applied, terminology,
              dashboard_config, feature_flags
       FROM wabyone_organizations WHERE id = $1`,
      [req.user.orgId],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Organization not found" });

    const userResult = await db(
      `SELECT tour_completed, tour_skipped FROM wabyone_users WHERE id = $1`,
      [req.user.userId],
    );

    res.json({
      org: result.rows[0],
      user: userResult.rows[0] || {},
    });
  } catch (err) {
    console.error("Onboarding status error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Apply an industry preset (creates categories, custom fields, sets terminology, theme)
router.post("/apply-preset", auth, async (req, res) => {
  const {
    preset_key,
    business_size,
    primary_goal,
    team_size,
    sub_industry,
    apply_categories = true,
    apply_custom_fields = true,
    apply_theme = true,
    apply_terminology = true,
  } = req.body;

  const preset = getPreset(preset_key);
  if (!preset) return res.status(400).json({ error: "Invalid preset key" });

  try {
    // 1. Update organization with industry info + theme + terminology + flags
    const themeUpdate = apply_theme ? JSON.stringify(preset.theme) : null;
    const termsUpdate = apply_terminology
      ? JSON.stringify(preset.terminology || {})
      : null;
    const dashUpdate = JSON.stringify({
      widgets: preset.dashboard_widgets || [],
    });
    const flagsUpdate = JSON.stringify(preset.feature_flags || {});

    await db(
      `UPDATE wabyone_organizations SET
         industry = $1,
         sub_industry = COALESCE($2, sub_industry),
         business_size = COALESCE($3, business_size),
         primary_goal = COALESCE($4, primary_goal),
         team_size = COALESCE($5, team_size),
         preset_applied = $6,
         preset_applied_at = NOW(),
         theme_config = COALESCE($7::jsonb, theme_config),
         terminology = COALESCE($8::jsonb, terminology),
         dashboard_config = $9::jsonb,
         feature_flags = $10::jsonb,
         updated_at = NOW()
       WHERE id = $11`,
      [
        preset_key,
        sub_industry || null,
        business_size || null,
        primary_goal || null,
        team_size || null,
        preset_key,
        themeUpdate,
        termsUpdate,
        dashUpdate,
        flagsUpdate,
        req.user.orgId,
      ],
    );

    // 2. Insert categories (skip duplicates by name)
    let categoriesAdded = 0;
    if (apply_categories && Array.isArray(preset.categories)) {
      for (const cat of preset.categories) {
        const exists = await db(
          `SELECT id FROM wabyone_categories WHERE org_id = $1 AND name = $2 LIMIT 1`,
          [req.user.orgId, cat.name],
        );
        if (exists.rows.length === 0) {
          await db(
            `INSERT INTO wabyone_categories (org_id, name, type, color) VALUES ($1, $2, $3, $4)`,
            [
              req.user.orgId,
              cat.name,
              cat.type || "product",
              cat.color || null,
            ],
          );
          categoriesAdded++;
        }
      }
    }

    // 3. Insert custom fields (skip duplicates by entity+field name)
    let fieldsAdded = 0;
    if (apply_custom_fields && Array.isArray(preset.custom_fields)) {
      for (const f of preset.custom_fields) {
        const exists = await db(
          `SELECT id FROM wabyone_custom_fields
           WHERE org_id = $1 AND entity_type = $2 AND field_name = $3 LIMIT 1`,
          [req.user.orgId, f.entity_type, f.field_name],
        );
        if (exists.rows.length === 0) {
          await db(
            `INSERT INTO wabyone_custom_fields
             (org_id, entity_type, field_name, field_label, field_type, options, is_required)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              req.user.orgId,
              f.entity_type,
              f.field_name,
              f.field_label,
              f.field_type || "text",
              JSON.stringify(f.options || []),
              !!f.is_required,
            ],
          );
          fieldsAdded++;
        }
      }
    }

    res.json({
      success: true,
      preset: preset_key,
      categoriesAdded,
      fieldsAdded,
      message: `${preset.label} preset applied successfully`,
    });
  } catch (err) {
    console.error("Apply preset error:", err.message, err.stack);
    res
      .status(500)
      .json({ error: "Failed to apply preset", details: err.message });
  }
});

// Ensure a default workspace exists for this org/preset (called after apply-preset)
router.post("/ensure-workspace", auth, async (req, res) => {
  const { preset_key, name } = req.body;
  const preset = preset_key ? getPreset(preset_key) : null;
  try {
    const existing = await db(
      `SELECT id FROM wabyone_workspaces WHERE org_id = $1 LIMIT 1`,
      [req.user.orgId],
    );
    if (existing.rows.length > 0) {
      return res.json({
        success: true,
        workspace_id: existing.rows[0].id,
        created: false,
      });
    }
    const wsName = name || preset?.label || "My Workspace";
    const wsResult = await db(
      `INSERT INTO wabyone_workspaces
        (org_id, name, industry, icon, theme_config, terminology, dashboard_config, feature_flags, is_default)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb, true) RETURNING id`,
      [
        req.user.orgId,
        wsName,
        preset_key || "general",
        preset?.icon || "🏢",
        JSON.stringify(preset?.theme || {}),
        JSON.stringify(preset?.terminology || {}),
        JSON.stringify({ widgets: preset?.dashboard_widgets || [] }),
        JSON.stringify(preset?.feature_flags || {}),
      ],
    );
    const wsId = wsResult.rows[0].id;
    // Link existing org data to this workspace (idempotent)
    await db(
      `UPDATE wabyone_categories SET workspace_id = $1 WHERE org_id = $2 AND workspace_id IS NULL`,
      [wsId, req.user.orgId],
    );
    await db(
      `UPDATE wabyone_custom_fields SET workspace_id = $1 WHERE org_id = $2 AND workspace_id IS NULL`,
      [wsId, req.user.orgId],
    );
    await db(
      `UPDATE wabyone_products SET workspace_id = $1 WHERE org_id = $2 AND workspace_id IS NULL`,
      [wsId, req.user.orgId],
    );
    await db(
      `UPDATE wabyone_services SET workspace_id = $1 WHERE org_id = $2 AND workspace_id IS NULL`,
      [wsId, req.user.orgId],
    );
    await db(
      `UPDATE wabyone_customers SET workspace_id = $1 WHERE org_id = $2 AND workspace_id IS NULL`,
      [wsId, req.user.orgId],
    );
    await db(
      `UPDATE wabyone_invoices SET workspace_id = $1 WHERE org_id = $2 AND workspace_id IS NULL`,
      [wsId, req.user.orgId],
    );
    await db(
      `UPDATE wabyone_org_members SET current_workspace_id = $1
       WHERE org_id = $2 AND current_workspace_id IS NULL`,
      [wsId, req.user.orgId],
    );
    res.json({ success: true, workspace_id: wsId, created: true });
  } catch (err) {
    console.error("Ensure workspace error:", err.message);
    res
      .status(500)
      .json({ error: "Failed to ensure workspace", details: err.message });
  }
});

// Mark onboarding complete
router.post("/complete", auth, async (req, res) => {
  try {
    await db(
      `UPDATE wabyone_organizations SET onboarding_completed = true, updated_at = NOW() WHERE id = $1`,
      [req.user.orgId],
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Complete onboarding error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Mark tour as completed/skipped (per user)
router.post("/tour", auth, async (req, res) => {
  try {
    const { completed, skipped } = req.body;
    await db(
      `UPDATE wabyone_users SET
         tour_completed = COALESCE($1, tour_completed),
         tour_skipped = COALESCE($2, tour_skipped)
       WHERE id = $3`,
      [completed ?? null, skipped ?? null, req.user.userId],
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Tour update error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// Reset preset (so user can re-apply a different one)
router.post("/reset-preset", auth, async (req, res) => {
  try {
    await db(
      `UPDATE wabyone_organizations SET
         preset_applied = NULL, preset_applied_at = NULL,
         terminology = '{}'::jsonb, dashboard_config = '{}'::jsonb,
         feature_flags = '{}'::jsonb, updated_at = NOW()
       WHERE id = $1`,
      [req.user.orgId],
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Reset preset error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
