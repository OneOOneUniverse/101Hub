# Social Sharing - Quick Reference

## ✅ Already Integrated

**Product Detail Pages** - Share button automatically shows with:
- Location: `app/products/[slug]/page.tsx`
- Button: "📤 Share" next to Add to Cart
- Platforms: WhatsApp, Facebook, Twitter, LinkedIn, Telegram, Email, Copy Link

## 🚀 Quick Start - Add to Product Cards

### Minimal Code:
```tsx
import ProductCardShare from "@/components/ProductCardShare";

// In your JSX:
<ProductCardShare 
  productName={product.name}
  productDescription={product.description}
  slug={product.slug}
  compact={true}
/>
```

### What it does:
- Creates a small icon share button (📤)
- Click shows platform menu
- Supports WhatsApp, Facebook, Twitter, LinkedIn, Telegram, Email, Copy Link

## 📱 Share Methods

| Method | Trigger |
|--------|---------|
| **Click Share button** | Opens platform menu |
| **Click platform** | Opens share dialog in new window |
| **Copy Link** | Copies product URL to clipboard |
| **Native Share** | Uses phone's native share (if available) |

## 🔧 Customization

### Full Button (with text):
```tsx
<ProductCardShare slug={slug} compact={false} />
```

### Icon Only:
```tsx
<ProductCardShare slug={slug} compact={true} />
```

### Custom Styling:
Edit Tailwind classes in:
- `components/SocialShareButton.tsx` - Large variant
- `components/ProductCardShare.tsx` - Both variants

## 📋 Supported Platforms

```
WhatsApp    → Direct message share
Facebook    → Timeline/Story/Messenger  
Twitter     → Tweet with hashtags
LinkedIn    → Professional post
Telegram    → Direct/Group/Channel
Email       → Email client
Copy Link   → Clipboard (universal)
Instagram   → Story (via copy link)
```

## 🎯 Platform-Specific Tips

### For Instagram Stories:
1. User clicks Share → Copy Link
2. Opens Instagram app
3. Creates story → Add Link Sticker
4. Pastes URL → Posts

### For WhatsApp Business:
Same as WhatsApp - automatically uses WhatsApp Business if installed

### For Email:
Opens default email client with:
- Subject: Product name
- Body: Description + Link

## 📂 File Reference

| File | Purpose |
|------|---------|
| `lib/social-share.ts` | URL generation & utility functions |
| `components/SocialShareButton.tsx` | Full share button (product pages) |
| `components/ProductCardShare.tsx` | Compact share (product cards) |
| `components/ProductDetailActions.tsx` | ✅ Already integrated |

## ✨ Features

- ✅ Works on mobile & desktop
- ✅ Native share API support
- ✅ Fallback to platform URLs
- ✅ Copy to clipboard with feedback
- ✅ Clean, responsive UI
- ✅ No external dependencies
- ✅ Type-safe TypeScript

## 🐛 Common Issues & Fixes

**Share button not showing?**
- Check that product props are passed to ProductDetailActions
- Verify productName and productSlug exist

**Share not working?**
- Check if popups are blocked
- Try Copy Link as fallback
- Test on different browser

**Styling broken?**
- Check Tailwind CSS is loaded
- Verify CSS variables (--brand) are defined
- Check for CSS conflicts

## ⚙️ Advanced - Custom Platforms

Add new platform in `lib/social-share.ts`:

```tsx
export function getCustomShareUrl(options: ShareOptions): string {
  // Generate URL for your platform
  return `https://platform.com/share?url=${options.url}`;
}

// Add to shareablePlatforms:
{
  id: "custom" as const,
  name: "Custom",
  icon: "🎯",
  getUrl: getCustomShareUrl,
}
```

## 📊 Analytics

Add event tracking in components:

```tsx
const handleShare = (platform: string) => {
  // Your analytics code
  gtag?.event?.('share_product', { platform, productId });
  
  // ... rest of function
};
```

## 🔗 Share URL Format

Generated URLs look like:
```
https://wa.me/?text=Product%20Name...&url=...
https://facebook.com/sharer?u=...
https://twitter.com/intent/tweet?url=...
```

## 💡 Pro Tips

1. **Share Incentives**: Offer rewards for shares to boost engagement
2. **Share Analytics**: Track which products get shared most
3. **Share Tracking**: Add UTM parameters for campaign tracking
4. **Share Timing**: Suggest sharing during flash sales
5. **Share Content**: Create share-worthy product descriptions

## 🎨 UI Components

### Full Share Button (product pages):
```
┌─────────────────────┐
│ 📤 Share            │
└─────────────────────┘
     When clicked:
┌──────────────────────┐
│ ↗ Share via...       │
├──────────────────────┤
│ 💬 WhatsApp          │
│ f  Facebook          │
│ 𝕏  Twitter           │
│ in LinkedIn          │
│ ✈  Telegram          │
│ ✉  Email             │
├──────────────────────┤
│ 🔗 Copy Link         │
└──────────────────────┘
```

### Compact Share Button (product cards):
```
┌───┐
│📤 │
└───┘
 Click:
┌────────────┐
│ 💬 f 𝕏    │
│ in ✈ ✉  │
├────────────┤
│ 🔗         │
└────────────┘
```

## 📚 Full Documentation

See these files for complete details:
- `SOCIAL_SHARING_GUIDE.md` - Complete feature guide  
- `SHARING_IMPLEMENTATION.md` - Implementation examples
- `lib/social-share.ts` - Function documentation
- Component files - Inline code comments

---

**Status**: ✅ Production Ready
**Last Updated**: 2026
**Platforms**: 8+ social networks supported
