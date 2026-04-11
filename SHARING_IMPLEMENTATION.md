# Social Media Sharing - Implementation Guide

## What's Been Implemented

### Files Added
1. **`lib/social-share.ts`** - Core sharing utilities for 11+ social platforms
2. **`components/SocialShareButton.tsx`** - Full share button for product detail pages
3. **`components/ProductCardShare.tsx`** - Compact share component for product listings
4. **`SOCIAL_SHARING_GUIDE.md`** - Comprehensive documentation

### Files Modified
1. **`components/ProductDetailActions.tsx`** - Already integrated! Share button appears with cart actions
2. **`app/products/[slug]/page.tsx`** - Passes product data to enable sharing

## Current State

✅ **Product Detail Page** - Share button already active
- Shows on product page with WhatsApp, Facebook, Twitter, LinkedIn, Telegram, Email options
- Copy link feature included
- Compact menu interface

## How to Use

### On Product Detail Pages (Already Working!)
The share button is automatically shown on:
- `app/products/[slug]/page.tsx` 

Users see a "📤 Share" button next to Add to Cart and View Cart buttons.

### Adding to Product Cards/Listings

To add sharing to your product browsing pages:

**Step 1:** Import the component
```tsx
import ProductCardShare from "@/components/ProductCardShare";
```

**Step 2a:** Use in compact mode (icon only)
```tsx
<ProductCardShare
  productName={product.name}
  productDescription={product.description}
  slug={product.slug}
  compact={true}
/>
```

**Step 2b:** Use in full mode (with text)
```tsx
<ProductCardShare
  productName={product.name}
  productDescription={product.description}
  slug={product.slug}
  compact={false}
/>
```

### Example: Product Card Component

```tsx
// components/ProductCard.tsx
"use client";

import Link from "next/link";
import ProductCardShare from "@/components/ProductCardShare";

export default function ProductCard({ product }) {
  return (
    <div className="border rounded-lg p-4">
      <img 
        src={product.image} 
        alt={product.name}
        className="w-full h-40 object-cover rounded"
      />
      
      <h3 className="mt-2 font-bold">{product.name}</h3>
      
      <p className="text-2xl font-bold text-[var(--brand)] mt-2">
        GHS {product.price}
      </p>
      
      <div className="mt-3 flex gap-2">
        <Link 
          href={`/products/${product.slug}`}
          className="flex-1 px-3 py-2 bg-[var(--brand)] text-white rounded"
        >
          View Details
        </Link>
        
        {/* Share Button */}
        <ProductCardShare
          productName={product.name}
          productDescription={`${product.name} - GHS ${product.price}`}
          slug={product.slug}
          compact={true}
        />
      </div>
    </div>
  );
}
```

### Example: Product Listing Page

```tsx
// app/products/page.tsx
"use client";

import ProductCard from "@/components/ProductCard";
import { useEffect, useState } from "react";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  
  useEffect(() => {
    // Fetch products...
  }, []);
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

## Supported Platforms

Users can share to:

| Platform | Feature |
|----------|---------|
| **WhatsApp** | Direct messaging with product link |
| **Facebook** | Timeline, stories, or messenger share |
| **Twitter/X** | Tweet with product link & hashtags |
| **LinkedIn** | Professional network sharing |
| **Telegram** | Group/channel/direct sharing |
| **Email** | Email client integration |
| **Instagram** | Story with link sticker (copy link method) |
| **Copy Link** | Copy to clipboard for any platform |

## Share Flow

```
User clicks Share button
         ↓
Menu appears with platforms
         ↓
User selects platform
         ↓
For social platforms: Opens share dialog in new window
For copy: Copies link to clipboard
         ↓
User completes share in their social app
```

## Customization Options

### Change Share Button Text
Edit in `SocialShareButton.tsx`:
```tsx
<button>
  <span>📤</span>
  <span>Share Product</span>  {/* Change this */}
</button>
```

### Change Button Styling
Both components use Tailwind CSS with `var(--brand)` colors. Modify classes like:
```tsx
className="rounded-full bg-[var(--brand)] px-4 py-2"
```

### Add More Platforms
1. Edit `lib/social-share.ts`
2. Add new function (example):
```tsx
export function getPinterestShareUrl(options: ShareOptions): string {
  const params = new URLSearchParams({
    url: options.url,
    description: options.title,
  });
  return `https://pinterest.com/pin/create/button/?${params.toString()}`;
}
```
3. Add to `shareablePlatforms` array:
```tsx
{
  id: "pinterest" as const,
  name: "Pinterest",
  icon: "📌",
  getUrl: getPinterestShareUrl,
}
```

## Testing the Feature

### Test Share Links
1. Go to any product page
2. Click "📤 Share" button
3. Try each platform:
   - **WhatsApp**: Should open WhatsApp with product message
   - **Facebook**: Should show Facebook share dialog
   - **Twitter**: Should open Tweet composer
   - **LinkedIn**: Should show LinkedIn share dialog
   - **Telegram**: Should open Telegram share
   - **Email**: Should open email client
   - **Copy Link**: Should copy product URL and show "✓ Link Copied!"

### Test on Mobile
Share buttons work on:
- iOS Safari / Chrome
- Android Chrome / Firefox
- Mobile WhatsApp / Facebook / etc.

## Troubleshooting

### Share button not showing on product page?
- Verify `productSlug` is being passed to `ProductDetailActions`
- Check browser console for errors
- Ensure `product.slug` exists in your data

### Sharing not working?
- Check if popup is being blocked by browser
- Try with popups allowed
- Use "Copy Link" as fallback
- Test on different browser

### Links broken?
- Verify product slug is correct
- Check if product page URL matches expected format
- Test the product URL directly in browser

## Analytics & Tracking

To track shares, modify `SocialShareButton.tsx`:

```tsx
const handleShare = async (platform: string) => {
  // Add your analytics here
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'share_product', {
      product_id: productId,
      product_name: productName,
      platform: platform,
    });
  }
  
  // ... rest of share logic
};
```

## SEO Optimization

The sharing feature helps with SEO by:
- Creating more backlinks to your products
- Increasing product page visibility
- Improving organic reach
- Enabling social sharing signals

## Next Steps

1. **Test**: Verify sharing works on all platforms
2. **Monitor**: Check if users are sharing products (add analytics if needed)
3. **Enhance**: Add share counts, referral tracking, or rewards later
4. **Promote**: Highlight sharing feature in your marketing

## Quick Links

- **Full Documentation**: See `SOCIAL_SHARING_GUIDE.md`
- **Sharing Utility**: `lib/social-share.ts`
- **Share Button**: `components/SocialShareButton.tsx`
- **Card Share**: `components/ProductCardShare.tsx`
- **Action Button Integration**: `components/ProductDetailActions.tsx`

---

**Status**: ✅ Ready to use
**Platforms Supported**: WhatsApp, Facebook, Twitter, LinkedIn, Telegram, Email, Copy Link
**Locations**: Product detail pages (active), Product cards (ready to implement)
