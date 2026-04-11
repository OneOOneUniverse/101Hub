# PRODUCTION DEPLOYMENT GUIDE

## ✅ What I've Already Prepared

### 1. SEO Files Created
- **`public/robots.txt`** — Allows search engines to crawl your site (excludes /admin, /api, etc.)
- **`public/sitemap.xml`** — Lists main routes for Google discovery
- **Enhanced metadata in `app/layout.tsx`** — Better keywords, OpenGraph tags for social sharing, canonical URLs, and robots directives

### ⚠️ Important: Update Domain References
In `robots.txt` and `sitemap.xml`, you'll see `yourdomain.com`. **Replace this with your actual domain** after you purchase it.

---

## 🔧 PHASE 1: Setup Clerk Production (Remove Development Label)

### Step 1: Get Production Clerk Keys
1. Open [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application (or create one if new)
3. Go to **Settings → API Keys**
4. Copy your **production keys** (they start with `pk_live_` and `sk_live_`)
   - **Note**: Do NOT use test keys (pk_test_) if you want to remove the development label
5. If you only see test keys, create a new "Production" environment in your Clerk app

### Step 2: Update .env.local with Production Keys
Replace these lines in `.env.local`:

```env
# BEFORE (test keys)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YXNzdXJpbmctaG9ybmV0LTkyLmNsZXJrLmFjY291bnRzLmRldiQ
CLERK_SECRET_KEY=sk_test_tuZyyOwlKLX1kO9GvQQCHJFFwfFeiBBMcrXnC2VU8T

# AFTER (production keys)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_[your_production_key_here]
CLERK_SECRET_KEY=sk_live_[your_production_secret_here]
```

### Step 3: Verify Changes
1. Push changes to your Git repo (GitHub/GitLab)
2. Vercel will auto-deploy
3. Visit your site's login page
4. ✅ The "Development" label should disappear
5. Test login/signup to ensure it works

---

## 🌐 PHASE 2: Get a Custom Domain

### Option A: Purchase via Popular Registrars
- **Namecheap** — $0.99-$2.99/year (easiest for beginners)
- **Google Domains** — $12/year but owned by Google
- **GoDaddy** — $0.99 first year, renewal varies
- **Hostinger** — Good value with hosting options

### Option B: Use Your Existing Domain (if you already own one)
Skip purchasing and go to Step 2

### Step 1: Purchase Domain (if needed)
1. Go to your chosen registrar
2. Search for your domain (e.g., `101hub.com`)
3. Buy the domain (register for 1-3 years)
4. Keep the registrar dashboard open for next steps

### Step 2: Connect Domain to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings → Domains**
4. Click **Add Domain**
5. Enter your domain (e.g., `101hub.com`)
6. Vercel will show DNS records to add

### Step 3: Update DNS at Your Registrar
1. Log into your registrar (Namecheap, GoDaddy, etc.)
2. Go to DNS settings for your domain
3. **Option A: Use Nameservers** (recommended)
   - Vercel provides 4 nameservers: ns1.vercel-dns.com, ns2.vercel-dns.com, ns3.vercel-dns.com, ns4.vercel-dns.com
   - Delete existing nameservers and add Vercel's
4. **Option B: Add DNS Records** (if registrar doesn't support nameservers)
   - Vercel shows specific A, CNAME, MX records to add
   - Add them one by one

### Step 4: Wait for DNS Propagation
- DNS typically propagates in 15 minutes to 48 hours
- Check status in Vercel dashboard — should show "Valid Configuration"
- Test: Visit `yourdomain.com` in browser

---

## 🔒 PHASE 3: Secure Your Site with Cloudflare (Free)

### Step 1: Sign Up for Cloudflare
1. Go to [Cloudflare.com](https://www.cloudflare.com)
2. Sign up for free account
3. Verify your email

### Step 2: Add Your Domain to Cloudflare
1. Once logged in, click **Add Site**
2. Enter your domain (e.g., `101hub.com`)
3. Select **Free Plan**
4. Cloudflare will provide 2 nameservers

### Step 3: Update Nameservers at Registrar (Again)
1. Log into your registrar
2. Replace Vercel's nameservers with Cloudflare's nameservers:
   - `ns1.cloudflare.com`
   - `ns2.cloudflare.com`
3. Save changes and wait for propagation (up to 48 hours)

### Step 4: Configure Cloudflare Settings
Once domain is active in Cloudflare:
1. Go to **SSL/TLS** → Set to **Full (strict)**
2. Go to **SSL/TLS** → **Edge Certificates** → Enable "Always Use HTTPS"
3. Go to **Security** → Set DDoS to **On** (Basic protection is free)
4. Go to **Caching** → Set cache level to **Standard** or **Aggressive**
5. (Optional) Create Page Rules for additional optimization

### Step 5: Verify Setup
- Visit your site and check browser's padlock icon — should show Cloudflare SSL
- Open DevTools → Network tab → Look for `cf-ray` header in response
- ✅ If cf-ray appears, Cloudflare is active

---

## 🔍 PHASE 4: Submit to Google Search Console

### Step 1: Add Site to Google Search Console
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Click **Add Property**
3. Enter your domain: `yourdomain.com` (without https://)
4. Verify ownership (Google will ask you to add a DNS record or HTML file)

### Step 2: Submit Sitemap
1. In GSC, go to **Sitemaps** (left menu)
2. Enter URL: `yourdomain.com/sitemap.xml`
3. Click **Submit**
4. Google will start crawling your site within hours

### Step 3: Request Indexing
1. Go to **Inspect URL** in GSC
2. Enter your homepage: `yourdomain.com`
3. Click **Request Indexing**
4. Google will prioritize crawling your homepage

### Timeline
- **Immediate**: robots.txt and sitemap.xml are available
- **1-7 days**: Google crawls your site
- **1-4 weeks**: Your pages appear in search results

---

## 📊 Optional: Add Google Analytics 4

1. Go to [Google Analytics](https://analytics.google.com)
2. Create new property for your domain
3. Get the measurement ID (format: G-XXXXXXXXXX)
4. Add to your site (install `@next/third-parties` and use `<GoogleAnalytics>` component)

---

## 🔑 Production Environment Variables

After going live, consider switching these keys from test to live:

```env
# Switch these when ready to accept payments
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_[your_live_key]  # Currently: pk_test_...
PAYSTACK_SECRET_KEY=sk_live_[your_live_key]                # Currently: sk_test_...

# Switch if using live SMS service
AFRICASTALKING_USERNAME=[your_live_app]  # Currently: twitchhimself (sandbox)
AFRICASTALKING_API_KEY=[your_live_api_key]
```

---

## ✅ Final Verification Checklist

- [ ] robots.txt is accessible at `yourdomain.com/robots.txt`
- [ ] sitemap.xml is accessible at `yourdomain.com/sitemap.xml`
- [ ] Clerk shows production environment (no "Development" label)
- [ ] Domain resolves to your site (DNS propagated)
- [ ] Cloudflare nameservers are active (check propagation)
- [ ] SSL certificate is valid (padlock icon in browser)
- [ ] Site loads over HTTPS
- [ ] Sitemap submitted to Google Search Console
- [ ] Homepage indexed in Google (check Google → "site:yourdomain.com")

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Domain still shows "pending" in Vercel | Wait 24-48 hours for DNS propagation; check registrar's DNS settings |
| Clerk showing "Development" label | Ensure you're using pk_live_ and sk_live_ keys (not pk_test_); redeploy |
| robots.txt/sitemap.xml getting 404 | These files must be in `public/` folder at root level; run `npm run build` to verify |
| Cloudflare nameservers not working | Verify you copied nameservers correctly; DNS can take up to 48 hours |
| Google can't crawl site | Check that robots.txt exists and `/` is allowed (not disallowed for Google crawlers) |

---

## 📞 Support Links

- Vercel Domains: https://vercel.com/docs/projects/domains
- Clerk Production Docs: https://clerk.com/docs/deployments/production-checklist
- Google Search Console Help: https://support.google.com/webmasters
- Cloudflare Setup: https://developers.cloudflare.com/fundamentals/setup/
