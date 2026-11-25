# Wholesale Pricing — Common + Special pricing

Shopify Plus custom app. Rules are managed on the app's own **Pricing** page in Shopify admin.

## How pricing is decided (per cart line)
1. **Special pricing** (specific customers and/or tags) always wins when one of its tiers is reached.
   Several Special rules apply → lowest price wins.
2. Otherwise **Common pricing** (Tagged / Logged-in / Guest / All). Several apply → lowest price wins.
3. Never raises a price above regular price.

## Features
- Pricing page with tabs: Common pricing / Special pricing
- Publish / Unpublish, Edit, Delete per rule (new rules start unpublished)
- Special: pick specific customers (search by name/email) and/or tags
- Common: Tagged customers, Logged-in customers, Guest customers, All customers
- Products: all / collections / products (Shopify picker, editable)
- Mix and match or per-product quantity
- Tiers: % off, amount off each, fixed price each
- Combining with discount codes: one switch, off by default
- Product-page tier table (theme block), follows the same priority
- Checkout shows the rule name as the discount label

## What's in here
- `app-home/` — the Pricing page (static HTML, no server). Host anywhere static.
- `extensions/lowest-price-discount/` — Shopify Function that applies prices at cart/checkout.
- `extensions/tier-table/` — theme block for the product page.

## Install
1. `npm init @shopify/app@latest` → **Build an extension-only app** → name `wholesale-pricing` → `cd wholesale-pricing`
2. `shopify app generate extension` → **Discount** → JavaScript → name `lowest-price-discount`
   - Replace `src/cart_lines_discounts_generate_run.graphql` and `.js` with the files here
   - Add the `[extensions.input.variables]` block from this repo's toml to the generated toml
3. `shopify app generate extension` → **Theme app extension** → name `tier-table`
   - Copy `blocks/tier-table.liquid` into `extensions/tier-table/blocks/`
4. Host the Pricing page:
   - Put your app's Client ID (Dev Dashboard → app → Settings) into `app-home/index.html` (`shopify-api-key` meta tag)
   - Deploy the `app-home/` folder as a static site (Render Static Site, Netlify or Cloudflare Pages)
   - On Render, add header `Content-Security-Policy: frame-ancestors https://*.myshopify.com https://admin.shopify.com`
     (Netlify/Cloudflare read `_headers` automatically)
5. Edit `shopify.app.toml`:
   ```toml
   application_url = "https://YOUR-STATIC-SITE-URL"
   embedded = true

   [access_scopes]
   scopes = "write_discounts,read_products,read_customers"

   [access.admin]
   direct_api_mode = "offline"
   embedded_app_direct_api_access = true
   ```
6. Dev Dashboard → app → **API access / Protected customer data** → request access to customer
   name + email (needed for the customer search in Special pricing).
7. `shopify app deploy`
8. Dev Dashboard → app → Distribution → Custom → ABM `.myshopify.com` → install link → Install
9. Shopify admin → Apps → Wholesale Pricing → add rules → Publish
   (first save creates the automatic discount "Wholesale pricing" — leave it alone in Discounts)
10. Theme editor → product template → Add block → Apps → **Wholesale tier table**

## Notes
- Turn off overlapping Wholesale All-in-One rules.
- Special rules need the customer to be logged in.
- If a Special rule matches but no tier is reached at that quantity, Common pricing applies.
