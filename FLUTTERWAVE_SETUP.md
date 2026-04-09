# Flutterwave Payment Integration Setup Guide

## Prerequisites

Before you can use Flutterwave payments, you need:

1. A Flutterwave account (https://dashboard.flutterwave.com)
2. Your Flutterwave API keys (Public Key and Secret Key)
3. Node Package Manager (npm or yarn)

## Installation Steps

### 1. Install Flutterwave SDK

Run the following command in your project directory:

```bash
npm install flutterwave-react-v3
```

Or with yarn:

```bash
yarn add flutterwave-react-v3
```

### 2. Add Environment Variables

Add the following to your `.env.local` file:

```env
NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY=your_public_key_here
FLUTTERWAVE_SECRET_KEY=your_secret_key_here
```

**How to get your keys:**

1. Log in to your Flutterwave Dashboard: https://dashboard.flutterwave.com
2. Go to **Settings** → **API** → **API Keys**
3. Copy both:
   - **Public Key** (starts with `pk_` for production or `pk_test_` for testing)
   - **Secret Key** (starts with `sk_` for production or `sk_test_` for testing)
4. For testing, use the "test" keys

### 3. Test Credentials (for development)

If using Flutterwave's sandbox environment:

- **Card Number**: 5531 8866 5725 2950
- **CVV**: 564
- **Expiry**: 09/32

### 4. Mobile Money (MTN Ghana) Test

For MTN Mobile Money testing:
- **Phone Number**: +233 550 013 407
- **Amount**: Any amount (e.g., 1.00 GHS)

### 5. Verify Installation

After installing and adding environment variables, restart your development server:

```bash
npm run dev
```

The payment method selector on checkout should now show the Flutterwave option.

## How It Works

### Payment Flow

1. **Customer chooses Flutterwave** on checkout form
2. **Customer fills delivery details** (name, address, phone, email)
3. **Customer clicks [Place Order]** button
4. **Order is created** with status `payment_pending`
5. **Flutterwave payment modal opens** with:
   - 40% downpayment amount
   - Customer details pre-filled
   - Secure payment options (Card, MTN Mobile Money, USSD)
6. **Customer completes payment** securely
7. **Payment is verified** with Flutterwave API
8. **Order status updated** to `payment_verified`
9. **Confirmation email sent** to customer and admin

### Manual Payment Flow (No Flutterwave)

If Flutterwave is not configured:

1. **Customer chooses Manual Transfer**
2. **Displays payment number** (+233 548656980)
3. **Customer uploads payment proof** (screenshot)
4. **Order is created** with status `payment_pending_admin_review`
5. **Admin reviews proof** in dashboard (/admin)
6. **Admin approves payment** → Order confirmed
7. **Confirmation email sent** to customer with tracking link

## Environment Variables Explained

| Variable | Purpose | Example |
|----------|---------|---------|
| `NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY` | Frontend SDK initialization (public) | `pk_live_abc123...` |
| `FLUTTERWAVE_SECRET_KEY` | Backend payment verification (secret) | `sk_live_xyz789...` |

**Important**: 
- `NEXT_PUBLIC_*` variables are visible in browser (use public key only)
- `FLUTTERWAVE_SECRET_KEY` is server-only (use secret key)
- Never commit these to version control

## Troubleshooting

### "Flutterwave is not configured" error

- Ensure both environment variables are set in `.env.local`
- Restart the dev server after adding/changing environment variables (Press `Ctrl+C` and run `npm run dev`)

### Payment modal not appearing

- Verify `NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY` is set correctly
- Check browser console for JavaScript errors
- Ensure the public key is for your correct environment (test vs live)

### Payment verification fails

- Verify `FLUTTERWAVE_SECRET_KEY` is set correctly
- Check that the secret key matches your public key environment
- Review server logs for detailed error messages

### Test payments not working

- Use Flutterwave test credentials (see above)
- Use test API keys (keys starting with `test_`)
- Ensure you're in Flutterwave sandbox mode

## Production Deployment

When deploying to production:

1. Switch to **Live API Keys** from Flutterwave dashboard
2. Update environment variables in your hosting provider (Vercel, Netlify, etc.)
3. **Never** use test keys in production
4. Test live payments with small amounts first
5. Enable email notifications for payment confirmations

## Support

For Flutterwave support: https://support.flutterwave.com/
For this integration: Check the checkout API documentation

---

Next Steps:
- After installation, the payment method selector will show "Flutterwave" option
- Manual payment method works without Flutterwave (always available)
- Both methods send emails to admin for order processing
