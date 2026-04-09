# Admin Page Guide

This guide explains how to use the admin content editor in this project.

## 1. Open Admin Page

1. Start the app:

```bash
npm run dev
```

2. Open:

http://localhost:3000/admin

## 2. What The Admin Page Controls

- Feature switches: Toggle core features on/off (promo slider, flash sale, services, wishlist, cart, checkout, reviews).
- Store basics: Store name, store description, footer text.
- Homepage: Hero text, CTA labels/links, highlight cards.
- Promo slider: Add/edit/remove promo slides.
- Flash sale: Banner/page text, timer duration, optional exact timer end date/time, discount, featured products.
- Products: Add/edit/remove products, including product image URL/path.
- Products: Add/edit/remove products, including primary image and gallery image paths .
- Services: Add/edit/remove service packages, including container image URL/path.

### Product image folders

- Every product now gets an image folder automatically at save/load time using this pattern:

`public/img/products/<product-slug>/`

- This applies to newly added products and existing products.
- Use that folder to keep extra images for the same product (gallery shots, alternate angles, etc.).
- In Admin, use **Gallery image paths (one per line)** for product detail galleries.

## 3. Save Workflow

1. Make your edits.
2. Click **Save Changes**.
3. Wait for the success message.
4. Refresh the public page to verify updates.

## 4. Product Section Tips

- Use the search field in the products section to find items by `name`, `id`, or `slug`.
- The page shows **Showing X of Y products** so you can confirm how many are visible.
- Keep `id` and `slug` unique per product.

## 5. Common Validation Rules

The save API rejects data when:

- Product IDs are duplicated.
- Product slugs are duplicated.
- Service IDs are duplicated.
- Promo slide IDs are duplicated.
- Homepage highlight IDs are duplicated.
- A flash sale featured product ID does not exist in the products list.
- Required fields are missing for products/services.

If a save fails, fix the reported issue and save again.

## 6. Flash Sale Timer Behavior

- If you set **Timer end date/time**, the countdown uses that exact date and time.
- If you leave it empty, the timer uses **Duration in hours** and rolls forward automatically.
- After editing timer settings, click **Save Changes** to apply.

## 7. Where Data Is Stored

- All editable content is stored in:

`data/site-content.json`

- Admin reads/saves through:

`/api/admin/content`

- Public pages read through:

`/api/store`

## 8. Important Security Note

Admin access is now authenticated with Clerk and restricted to admin users only.

To configure admin access:

1. Create a Clerk app and add the environment variables in `.env.local`:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
```

2. Set one of these admin authorization methods:

- Add `role: "admin"` to a user's public metadata in the Clerk Dashboard.
- Or add a comma-separated allowlist in `.env.local`:

```bash
ADMIN_EMAILS=owner@example.com,admin2@example.com
```

3. Restart dev server after env changes.

Protected routes:

- `/admin`
- `/api/admin/content`

Any signed-in non-admin user is redirected away from admin pages and receives `403` for admin API calls.