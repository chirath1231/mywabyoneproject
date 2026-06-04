/**
 * Plan-tier limits.
 */
const PLAN_LIMITS = {
  free: { workspaces: 1, label: "Starter" },
  business: { workspaces: 5, label: "Business" },
  enterprise: { workspaces: Infinity, label: "Enterprise" },
};

function getLimit(tier) {
  return PLAN_LIMITS[tier] || PLAN_LIMITS.free;
}

module.exports = { PLAN_LIMITS, getLimit };
