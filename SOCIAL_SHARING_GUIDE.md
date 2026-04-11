# Social Media Sharing Feature

## Overview

Users can now easily share products from your 101Hub store to their social media stories, statuses, pages, and platforms. This feature includes support for multiple platforms and native sharing options.

## Features

### Supported Platforms

The sharing feature supports the following social media platforms:

- **WhatsApp** - Direct messaging and WhatsApp Business
- **Facebook** - Share to timeline, stories, and messenger
- **Twitter/X** - Tweet sharing with hashtags
- **LinkedIn** - Professional network sharing
- **Telegram** - Direct messaging and channels
- **Email** - Share via email client
- **Copy Link** - Copy shareable product link to clipboard
- **Web Share API** - Native sharing (when supported by browser)

### Platform-Specific Features

#### Instagram Stories/Status
- For Instagram, users can:
  1. Click the Share button
  2. Select "Copy Link"
  3. Open Instagram app and add link sticker to story
  4. This allows direct story linking with the product URL

#### WhatsApp Stories
- Products can be shared directly to WhatsApp with:
  - Product name
  - Product description
  - Direct link to product
  - Shareable to both personal and group chats

#### Facebook
- Shares to Facebook timeline with:
  - Rich product information
  - Direct link
  - 101Hub hashtag included

#### Twitter/X
- Products shared with:
  - Product name as tweet text
  - Hashtags (#101Hub, #shopping, #gadgets)
  - Direct product link

## Components

### 1. SocialShareButton Component

**Location:** `components/SocialShareButton.tsx`

Full-featured share button for product detail pages with dropdown menu.

**Usage:**
```tsx
import SocialShareButton from "@/components/SocialShareButton";

<SocialShareButton
  productId="product-123"
  productName="Awesome Gadget"
  productDescription="A great gadget for everyone"
  productImage="/img/products/gadget.jpg"
  slug="awesome-gadget"
/>
```

**Props:**
- `productId` (string) - Unique product identifier
- `productName` (string) - Product name
- `productDescription` (string, optional) - Product description
- `productImage` (string, optional) - Product image URL
- `slug` (string) - Product URL slug

### 2. ProductCardShare Component

**Location:** `components/ProductCardShare.tsx`

Compact share component for use in product listings and cards.

**Usage:**
```tsx
import ProductCardShare from "@/components/ProductCardShare";

// Compact mode (icon only)
<ProductCardShare
  productName="Gadget"
  productDescription="Description"
  slug="product-slug"
  compact={true}
/>

// Full mode
<ProductCardShare
  productName="Gadget"
  productDescription="Description"
  slug="product-slug"
  compact={false}
/>
```

**Props:**
- `productName` (string) - Product name
- `productDescription` (string, optional) - Product description
- `slug` (string) - Product URL slug
- `compact` (boolean, optional) - Use compact icon-only mode (default: false)

### 3. Social Share Utility

**Location:** `lib/social-share.ts`

Core utility functions for generating share URLs and handling sharing logic.

**Available Functions:**

```typescript
// Get share URLs for specific platforms
getWhatsAppShareUrl(options)
getFacebookShareUrl(options)
getTwitterShareUrl(options)
getLinkedInShareUrl(options)
getTelegramShareUrl(options)
getEmailShareUrl(options)

// Clipboard utilities
copyToClipboard(text) // Promise<boolean>
isWebShareAvailable() // boolean

// Native sharing (Web Share API)
nativeShare(options) // Promise<void>

// Get all available platforms
shareablePlatforms // Array of platform configs
```

## Integration

### ProductDetailActions Integration

The `ProductDetailActions` component has been updated to include the social share button automatically when product information is provided:

```tsx
<ProductDetailActions 
  productId={product.id} 
  features={content.features}
  productName={product.name}
  productDescription={product.description}
  productImage={product.image}
  productSlug={product.slug}
/>
```

### Adding to Product Cards

To add sharing to product listing cards, use the `ProductCardShare` component:

```tsx
import ProductCardShare from "@/components/ProductCardShare";

// In your product card JSX
<ProductCardShare
  productName={product.name}
  productDescription={product.description}
  slug={product.slug}
  compact={true}
/>
```

### Adding to Custom Locations

To use sharing in other components, import the utility functions:

```tsx
import { 
  getWhatsAppShareUrl, 
  getFacebookShareUrl,
  copyToClipboard,
  type ShareOptions 
} from "@/lib/social-share";

const options: ShareOptions = {
  url: productUrl,
  title: "Product Name",
  description: "Product description",
  imageUrl: "image-url"
};

const whatsapp = getWhatsAppShareUrl(options);
window.open(whatsapp, "_blank");
```

## How Users Share Products

### Desktop/Web
1. Click the **"📤 Share"** button on product page
2. Choose platform from the dropdown menu
3. Pop-up opens for that platform
4. Complete sharing on the selected platform

### Mobile
- **WhatsApp/Email/Telegram:** Direct app integration
- **Facebook/Twitter:** Opens app or web version
- **Copy Link:** Copy and paste into preferred app

### Story/Status Sharing

**Instagram Stories:**
```
1. Click Share → Copy Link
2. Open Instagram app
3. Create new story
4. Add "Link Sticker"
5. Paste product URL
6. Post story
```

**WhatsApp Status:**
```
1. Click Share → WhatsApp
2. Choose contact or group
3. Message sent with product link
4. Recipient can tap link to view product
```

**Facebook Stories:**
```
1. Click Share → Facebook
2. Share to story option
3. Product link appears in story
4. Friends can tap to view
```

## Technical Details

### URL Generation

Share URLs are generated using platform-specific APIs:
- Platform-provided share interfaces (Graph API, Twitter API, etc.)
- Standard URL parameters for each platform
- Product information encoded in URL parameters

### Browser Compatibility

- **Web Share API**: Modern browsers (Chrome, Firefox, Safari, Edge)
- **Clipboard API**: All modern browsers with fallback to `document.execCommand`
- **Platform URLs**: Universal web support

### Privacy & Security

- No personal data stored
- Share URLs are simple product links
- No tracking or analytics
- Platform-specific privacy policies apply

## Customization

### Changing Share Text

Edit the `ShareOptions` generation in components:

```tsx
const shareOptions: ShareOptions = {
  url: productUrl,
  title: productName,
  description: "Custom description here", // ← Customize this
  imageUrl: productImage,
};
```

### Adding More Platforms

1. Add new function to `lib/social-share.ts`:
```tsx
export function getYourPlatformShareUrl(options: ShareOptions): string {
  // Generate URL using platform's share API
}
```

2. Add to `shareablePlatforms` array:
```tsx
{
  id: "yourplatform" as const,
  name: "Your Platform",
  icon: "🎯",
  getUrl: getYourPlatformShareUrl,
}
```

3. Component will automatically update!

### Styling Customization

Modify Tailwind classes in components:

**SocialShareButton:**
- Button styling: `rounded-full border border-[var(--brand)]...`
- Menu styling: `rounded-xl border border-black/10 bg-white...`
- Platform items: `px-4 py-3 hover:bg-[var(--brand)]/5...`

**ProductCardShare:**
- Compact button: `w-8 h-8 rounded-full`
- Full mode: `rounded-lg border border-black/10`

## Analytics Integration

To track shares, add event tracking:

```tsx
const handleShare = (platform: string) => {
  // Your analytics
  trackEvent('product_shared', { platform, productId });
  
  // Existing share logic...
};
```

## Troubleshooting

### Share button not appearing
- Check that product props are being passed to `ProductDetailActions`
- Verify `productName` and `productSlug` are provided

### Platform share not working
- Check if URL is properly formatted
- Verify browser cookies/permissions for the platform
- Try the "Copy Link" option as fallback

### Copy to clipboard fails
- Browser may require user interaction for clipboard access
- Try again or use manual copy method

## Files Added

- `lib/social-share.ts` - Sharing utility functions
- `components/SocialShareButton.tsx` - Full share button component
- `components/ProductCardShare.tsx` - Compact share component
- `components/SOCIAL_SHARING_GUIDE.md` - This documentation

## Files Modified

- `components/ProductDetailActions.tsx` - Added share button integration
- `app/products/[slug]/page.tsx` - Pass product data to ProductDetailActions

## Future Enhancements

Possible additions:
- Share analytics dashboard
- Social sharing referral tracking
- Product-specific share images/OG tags
- Share countdown for flash sales
- Share rewards program
- Custom share messages per platform
