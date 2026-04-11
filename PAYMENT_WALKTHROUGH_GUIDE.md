# Payment Walkthrough Configuration Guide

## Overview

The manual payment walkthrough on the checkout page is now **fully editable** from the admin panel. You can:

- ✅ Add/remove payment steps
- ✅ Edit step titles and descriptions  
- ✅ Upload images/screenshots for each step
- ✅ Add bullet points to each step
- ✅ Reorder steps by step number
- ✅ See live preview in admin

---

## Accessing Payment Walkthrough Editor

1. Go to **`/admin`** (Admin Dashboard)
2. Click on the **"Payment Walkthrough"** tab in the navigation bar
3. You'll see the payment steps editor

---

## Adding a New Step

### Step 1: Click "Add Step" Button
Located in the top-right of the Payment Walkthrough section.

### Step 2: Fill in Step Details

| Field | Description | Example |
|-------|-------------|---------|
| **Step Number** | Order of this step (1, 2, 3, etc.) | `1` |
| **Title** | Short, clear step title | "Open Your Mobile Money App" |
| **Description** | Detailed explanation | "Launch your mobile money application or bank app..." |
| **Bullet Points** | One per line for sub-details | See below |
| **Step Image** | Screenshot showing the step | Upload or link |

### Step 3: Save Changes
Click **"Save Changes"** at the top of the admin page once you're done editing all steps.

---

## Editing Existing Steps

1. Scroll to the step you want to edit
2. Modify any field:
   - Title
   - Description
   - Bullet points
   - Image
3. **Replace Button**: Upload a new image to replace the current one
4. **Preview**: Image preview appears automatically after upload
5. **Save Changes** when done

---

## Adding Bullet Points

In the **"Bullet Points"** field, enter one item per line:

```
Recipient phone number
Amount sent
Transaction reference
Date & time
Status (Success/Completed)
```

Each line becomes a bullet point in the walkthrough on checkout.

---

## Uploading Step Images

### What to Upload
- **Screenshot** of the payment process in action
- **Phone screenshots** showing the mobile money app
- **Receipt confirmation** screen examples
- **Clear demonstration** of what that step looks like

### File Requirements
- Format: JPG, PNG, WebP, or other common image formats
- Size: Max 5MB
- Resolution: 800x600 or larger recommended

### How to Upload

**Method 1: Upload Button**
1. Click the **"Upload Image"** button below the image URL field
2. Select image from your computer
3. Wait for upload to complete
4. Image URL will populate automatically

**Method 2: Manual URL**
1. Enter image URL directly in the "Image URL or path" field
2. Example: `/payment-walkthrough/step-1.jpg` or `https://example.com/step.jpg`
3. Changes take effect immediately

### Preview
After uploading/linking, a **preview** appears showing exactly how the image will look on checkout.

---

## Removing a Step

1. Scroll to the step to remove
2. Click the red **"Remove Step"** button at the bottom
3. Click **"Save Changes"** to confirm

---

## Reordering Steps

Since each step has a **"Step Number"** field, you can reorder by:

1. Edit the step number of each step
2. Example: Change Step 2 to Step 1, Step 1 to Step 2, etc.
3. Steps automatically sort by step number (lowest first)
4. **Save Changes** when done

---

## Live Checkout Preview

To see how your walkthrough appears to customers:

1. Go to **`/checkout`** on your store
2. Select **"Manual Transfer (Upload Proof)"** as payment method
3. Your walkthrough steps will display with:
   - Numbered circles (1, 2, 3, etc.)
   - Step titles in bold
   - Descriptions and bullet points
   - Images you uploaded (if any)

---

## Best Practices

### ✅ Do This
- **Use clear, simple language** - Customers should understand without confusion
- **Keep descriptions concise** - 1-2 sentences is ideal
- **Upload high-quality images** - Make steps visually clear
- **Number steps logically** - 1, 2, 3, 4, 5 in order
- **Be specific** - "MTN Mobile Money app" not just "mobile app"
- **Include all important details** - Amount, phone number, date, time
- **Test on mobile** - Make sure images display well on phones

### ❌ Don't Do This
- ❌ Unclear step titles
- ❌ Very long descriptions (should be brief)
- ❌ Blurry or cut-off images
- ❌ Missing step numbers
- ❌ Confusing order of steps
- ❌ Duplicate steps
- ❌ Images that don't match the step description

---

## Recommended Walkthrough Steps

Here's a good 5-step structure for manual payment:

### Step 1: Open Your App
**Title:** Open Your Mobile Money / Bank App
**Description:** Launch your payment app (MTN Mobile Money, Vodafone Cash, your bank app, etc.)

### Step 2: Send Transfer
**Title:** Send Transfer  
**Description:** Create a new transfer. Enter the recipient phone number and amount to send.
**Bullets:**
- Recipient: +233 548656980
- Amount: Check order confirmation
- Add order reference in memo (optional)

### Step 3: Save Confirmation
**Title:** Save the Confirmation Screen
**Description:** Wait for the transfer to complete. Your app will show a confirmation message with a reference number.
**Bullets:**
- Shows recipient number
- Shows amount sent
- Shows reference/receipt number
- Shows transaction status (Success/Completed)

### Step 4: Take Screenshot
**Title:** Take a Screenshot
**Description:** Take a clear screenshot of the confirmation screen on your phone.
**Bullets:**
- Must show amount: GHS [amount]
- Must show recipient: +233 548656980
- Must show transaction reference number
- Must show date and time

### Step 5: Upload Proof
**Title:** Upload Screenshot Below
**Description:** Upload the screenshot using the file upload section to complete your order.
**Bullets:**
- Click "Choose File" button
- Select the screenshot from your phone
- Wait for upload to complete
- Click "Place Order"

---

## Troubleshooting

### Images Not Showing on Checkout
- Verify image URL is correct and accessible
- Check image file format (JPG, PNG supported)
- Try uploading a different image
- Refresh browser cache

### Changes Not Saving
- Make sure you clicked **"Save Changes"** button
- Check for error messages at top of page
- Try refreshing the admin page
- Contact support if issue persists

### Steps Out of Order
- Check step numbers are sequential (1, 2, 3, etc.)
- Steps display in order of step number (lowest first)
- Edit step numbers and save

### Image Upload Fails
- Check file size (max 5MB)
- Verify file format is image (JPG, PNG, etc.)
- Try different image
- Check internet connection

---

## Example: Setting Up with Screenshots

### Best Approach:
1. **Go through payment process yourself** on your phone
2. **Take screenshots** at each step
3. **Save those screenshots** to your computer
4. **Upload to admin** one by one
5. **Write descriptions** matching what the screenshots show
6. **Test on checkout** to verify everything looks good

---

## FAQ

**Q: Can customers see differences if I edit the walkthrough?**
A: Yes! Changes appear immediately on the checkout page (after refresh).

**Q: What if I don't upload images?**
A: The walkthrough still shows titles and descriptions. Images are optional but recommended.

**Q: Can I have more than 5 steps?**
A: Yes! Add as many steps as needed. Keep them clear and focused.

**Q: Do images need to be from my phone?**
A: No. Any clear images/screenshots of the payment process work.

**Q: Can I temporarily hide a step?**
A: Remove it or set step number very high (e.g., 999). Or just delete and save steps you want to show.

---

## Support

For help or questions about the payment walkthrough:
- Review this guide
- Check the admin panel hints below each field
- Contact your support team

---

**Next Steps:**
1. Go to `/admin`
2. Click "Payment Walkthrough"
3. Add your first step
4. Upload an image to demonstrate
5. Save changes
6. Test on `/checkout`

Done! Your custom walkthrough is live for customers.
