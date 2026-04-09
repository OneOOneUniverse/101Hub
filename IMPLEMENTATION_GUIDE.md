# 40% Downpayment System - Quick Start Guide

## What Was Implemented

Your website now has a complete **two-payment system** with **hybrid payment support**:

1. Customers pay **40% downpayment** to confirm their order
2. Customers pay remaining **60% cash at delivery**
3. Two payment methods: **Flutterwave (online)** or **Manual Transfer (proof upload)**
4. **Admin dashboard** to verify and approve payments
5. **Order tracking** page for customers to check status

---

## How It Works: Customer Perspective

### Manual Payment (Works Now)
1. Customer selects "Manual Transfer" on checkout
2. Sees their payment number: **+233 548656980**
3. **Uploads screenshot** of transfer receipt
4. Admin reviews and approves (or rejects)
5. Customer gets confirmation email + tracking link
6. Pays remaining 60% at delivery

### Flutterwave Payment (When Configured)
1. Customer selects "Flutterwave (MTN Mobile Money / Bank)"
2. Fills out delivery details
3. Clicks [Place Order]
4. **Secure payment modal opens** (no credit card data stored)
5. Customer pays **40% downpayment** instantly
6. Order confirmed immediately
7. Admin notification sent
8. Pays remaining 60% at delivery

---

## How to Set Up Flutterwave (Optional)

### Step 1: Create Flutterwave Account
- Go to https://dashboard.flutterwave.com
- Sign up and verify your account

### Step 2: Get API Keys
- Go to **Settings** → **API** → **API Keys**
- Copy your **Public Key** and **Secret Key**

### Step 3: Add to Environment
Edit `.env.local` and add:
```env
NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY=pk_test_xxxxx
FLUTTERWAVE_SECRET_KEY=sk_test_xxxxx
```

### Step 4: Test Payment
1. Go to checkout
2. Select "Flutterwave" payment method
3. Use test credentials:
   - **Card**: 5531 8866 5725 2950
   - **CVV**: 564
   - **Expiry**: 09/32

### Step 5: Go Live
- Switch to **Live API Keys** in Flutterwave dashboard
- Update `.env.local` with live keys
- Test with small amounts first

---

## How It Works: Admin Perspective

### Access Admin Dashboard
Go to `/admin` (requires logged in as admin)

### New "💳 Pending Payments" Section
Shows two types of pending payments:

**Manual Transfer Verification (⏳)**
- Shows customer name, phone, amount
- **View Screenshot** button to see payment proof
- **[Approve]** - confirm payment received
- **[Reject]** - decline payment
- **[Call]** - dial customer directly

**Flutterwave Payments (✓ Auto-Verified)**
- Shows customer name, phone, amount
- **✓ VERIFIED** badge (automatically verified with Flutterwave)
- **[Confirm Order]** - mark order as confirmed
- **[Call]** - contact customer

### Actions Available
- **Approve**: Payment verified → customer gets confirmation → order moves to "confirmed" status
- **Reject**: Payment declined → send rejection email → customer can retry
- **Call**: Direct phone link to contact customer

---

## File Structure

### Key Files Created:
```
components/
  ├── CheckoutForm.tsx (UPDATED) - Payment method selection, proof upload
  ├── FlutterWaveButton.tsx (NEW) - Flutterwave payment integration
  └── PendingPaymentsDashboard.tsx (NEW) - Admin payment review

app/
  ├── orders/[reference]/page.tsx (NEW) - Order tracking page
  ├── admin/page.tsx (UPDATED) - Added pending payments section
  └── api/
      ├── checkout/
      │   ├── route.ts (UPDATED)
      │   ├── verify-payment/route.ts (NEW)
      │   └── confirm-order/route.ts (NEW)
      └── admin/
          ├── pending-payments/route.ts (NEW)
          └── verify-payment/route.ts (NEW)

lib/
  └── order-status.ts (NEW) - Order status utilities & localStorage
```

---

## Important: Data Storage

**Current Implementation:**
- Orders stored in **localStorage** (browser)
- Backed up via **email** (to admin & customer)
- ⚠️ **Data lost** if browser cache is cleared

**Recommended Next Step:**
Add databases to persist orders permanently:
- Create `Supabase` or `PostgreSQL` database
- Add order persistence API
- Enable customer order history
- Add delivery status updates

---

## Email Templates

Customers now receive emails with:
- ✅ 40% downpayment amount calculated
- ✅ Payment method (Flutterwave/Manual)
- ✅ Payment status (pending/verified)
- ✅ Remaining 60% balance due at delivery
- ✅ Order tracking link
- ✅ Support contact info

Admin receives emails with:
- ✅ Complete order details
- ✅ Payment method and status
- ✅ Customer contact info
- ✅ For manual payments: PAYMENT PROOF ATTACHED (base64)
- ✅ Action required indicator

---

## Order Tracking Page

Customers can view their order at:
```
/orders/{orderRef}
```

Example: `/orders/GH-1743754328450`

Shows:
- **Timeline**: Payment Sent → Verified → Confirmed → In Transit → Delivered
- **Payment Details**: Method, downpayment, remaining balance
- **Order Items**: Products, quantities, prices
- **Delivery Info**: Name, phone, address
- **Support Links**: Call or email support

---

## Testing Checklist

### Manual Payment Testing ✅
- [ ] Go to `/checkout`
- [ ] Select "Manual Transfer"
- [ ] Fill form with test data
- [ ] Upload a screenshot (any image file)
- [ ] Click [Place Order]
- [ ] See confirmation screen with tracking link
- [ ] Go to `/admin`
- [ ] See pending payment with proof thumbnail
- [ ] Click [Approve]
- [ ] Repeat process: should see it removed from pending

### Flutterwave Testing (After Setup)
- [ ] Set `FLUTTERWAVE_PUBLIC_KEY` in `.env.local`
- [ ] Restart dev server: `npm run dev`
- [ ] Go to `/checkout`
- [ ] Select "Flutterwave" option
- [ ] Click [Place Order]
- [ ] Flutterwave modal should open
- [ ] Complete test payment
- [ ] See confirmation immediately

### Admin Dashboard Testing
- [ ] Add pending payment (manual method)
- [ ] Go to `/admin`
- [ ] Click "View Screenshot" - should show image modal
- [ ] Click [Approve] - payment should disappear
- [ ] Click [Call] - should dial customer's phone

### Order Tracking Testing
- [ ] From checkout confirmation, click "📍 Track Order"
- [ ] See order timeline with current status
- [ ] See payment and delivery details
- [ ] Verify order ref matches email

---

## Payment Numbers

**For Manual Transfer:**
```
+233 548656980
```

Display on checkout form and emails for customers.

**For Flutterwave:**
No manual payment number needed - all online.

---

## Monthly Costs & Considerations

| Item | Cost | Notes |
|------|------|-------|
| Flutterwave | 1.4% per transaction | Only if using online payments |
| Database (Supabase) | $0-50/month | Only if adding persistence |
| Email (Gmail) | Free | Already configured |
| SMS notifications | $0.01-0.05 per SMS | Optional future feature |

---

## Common Issues & Solutions

**"Flutterwave is not configured" error**
→ Add `NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY` to `.env.local` and restart server

**Payment proof won't upload**
→ Check file size (max 5MB), must be image format

**Pending payments not showing in admin**
→ No orders created yet (TODO: add database to persist)

**Order tracking link broken**
→ Orders only stored in localStorage (clear cache = order data lost)

---

## Next Steps

### Immediate (1-2 hours)
1. ✅ Test manual payment flow end-to-end
2. ✅ Test admin approval process
3. ✅ Check emails have correct amounts
4. ✅ Test order tracking page

### Short-term (1-2 days)
1. Setup Flutterwave account and test online payments
2. Update payment number if needed
3. Review admin dashboard interface
4. Train staff on payment approval process

### Long-term (1-2 weeks)
1. Add Supabase database for order persistence
2. Add customer order history page
3. Add delivery status tracking by admin
4. Add SMS payment reminders
5. Setup automatic payment expiry (e.g., 2 days)

---

## Support Contacts

**System Issues:**
- Check error logs in browser Console (F12)
- Check server logs in terminal

**Flutterwave Support:**
- Website: https://support.flutterwave.com/

**GadgetHub Contact:**
- Phone: +233 548656980
- Email: josephsakyi247@gmail.com

---

**Implementation Date:** April 2, 2026
**Last Updated:** Implementation Complete
