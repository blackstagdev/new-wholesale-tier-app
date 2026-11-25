// Wholesale pricing.
// Priority: Special pricing beats Common pricing.
// Within the winning level, the lowest unit price wins.
// If no Special rule reaches a tier for a line, Common pricing applies.

const round2 = (n) => Math.round(n * 100) / 100;

function pickTier(tiers, qty) {
  let best = null;
  for (const t of tiers) {
    const min = Number(t.minQty) || 1;
    if (qty >= min && (!best || min > Number(best.minQty))) best = t;
  }
  return best;
}

function applyTier(price, tier) {
  const v = Number(tier.value) || 0;
  let unit = price;
  if (tier.type === "percent") unit = price * (1 - v / 100);
  else if (tier.type === "fixed_off") unit = price - v;
  else if (tier.type === "fixed_price") unit = v;
  return Math.max(0, round2(unit));
}

export function cartLinesDiscountsGenerateRun(input) {
  if (!(input.discount?.discountClasses || []).includes("PRODUCT")) return { operations: [] };

  const rules = (input.discount?.rules?.jsonValue || []).filter(
    (r) => r.enabled && Array.isArray(r.tiers) && r.tiers.length
  );
  if (!rules.length) return { operations: [] };

  const customer = input.cart.buyerIdentity?.customer || null;
  const tags = new Set(
    (customer?.hasTags || []).filter((t) => t.hasTag).map((t) => t.tag.toLowerCase())
  );
  const hasAnyTag = (list) => (list || []).some((t) => tags.has(String(t).toLowerCase()));

  const matchesCustomer = (r) => {
    if (r.kind === "special") {
      if (!customer) return false;
      return (r.customers || []).some((c) => c.id === customer.id) || hasAnyTag(r.tags);
    }
    switch (r.group) {
      case "all": return true;
      case "guest": return !customer;
      case "logged_in": return !!customer;
      case "tagged": return !!customer && hasAnyTag(r.tags);
      default: return false;
    }
  };

  const lines = input.cart.lines
    .filter((l) => l.merchandise.__typename === "ProductVariant")
    .map((l) => ({
      id: l.id,
      qty: l.quantity,
      price: parseFloat(l.cost.amountPerQuantity.amount),
      productId: l.merchandise.product.id,
      collections: new Set(
        (l.merchandise.product.inCollections || []).filter((c) => c.isMember).map((c) => c.collectionId)
      ),
    }));

  const matchesLine = (r, l) => {
    if (r.scope === "all") return true;
    if (r.scope === "products") return (r.products || []).some((p) => p.id === l.productId);
    if (r.scope === "collections") return (r.collections || []).some((c) => l.collections.has(c.id));
    return false;
  };

  // lineId -> { special: {unit,name}|null, common: {unit,name}|null }
  const offers = new Map(lines.map((l) => [l.id, { special: null, common: null }]));

  for (const r of rules) {
    if (!matchesCustomer(r)) continue;
    const eligible = lines.filter((l) => matchesLine(r, l));
    if (!eligible.length) continue;

    const mixTotal = eligible.reduce((s, l) => s + l.qty, 0);
    const perProduct = {};
    for (const l of eligible) perProduct[l.productId] = (perProduct[l.productId] || 0) + l.qty;

    const level = r.kind === "special" ? "special" : "common";
    for (const l of eligible) {
      const qty = r.countMode === "product" ? perProduct[l.productId] : mixTotal;
      const tier = pickTier(r.tiers, qty);
      if (!tier) continue;
      const unit = applyTier(l.price, tier);
      const o = offers.get(l.id);
      if (!o[level] || unit < o[level].unit) o[level] = { unit, name: r.name || "Wholesale price" };
    }
  }

  const candidates = [];
  for (const l of lines) {
    const o = offers.get(l.id);
    const win = o.special || o.common; // special always takes priority
    if (!win) continue;
    const off = round2(l.price - win.unit);
    if (off <= 0) continue;
    candidates.push({
      message: win.name,
      targets: [{ cartLine: { id: l.id } }],
      value: { fixedAmount: { amount: off.toFixed(2), appliesToEachItem: true } },
    });
  }

  if (!candidates.length) return { operations: [] };
  return { operations: [{ productDiscountsAdd: { candidates, selectionStrategy: "ALL" } }] };
}
