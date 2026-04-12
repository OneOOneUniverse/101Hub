# Admin-Customer Messaging System - Quick Start Guide

## Overview
Admins can now send real-time updates and messages to customers for each active order. The messaging system is fully integrated into the admin dashboard with a beautiful, intuitive interface.

## Features

### Message Types
The admin can choose from three message types when communicating with customers:

1. **📬 Update** - For general status updates (e.g., "Your order has been packed and is ready for pickup")
2. **🎯 Milestone** - For important milestones (e.g., "Order confirmed! We're now processing your payment")
3. **💬 Custom** - For any custom messages (e.g., "Hi! Your delivery driver will arrive in 30 minutes")

### Message Highlighting
- Mark important messages with **⭐ Highlight** to make them stand out
- Highlighted messages appear with a yellow background and semi-bold styling
- Useful for time-sensitive updates or critical information

## How to Use

### Sending a Message
1. Go to the **Admin Dashboard** → **Active Orders** tab
2. Each confirmed or in-transit order shows a message button
3. Click the **💬 Message Button** to see all messages for that order (or click to expand if it's collapsed)
4. In the message panel:
   - Type your message (up to 500 characters)
   - Select a message type from the dropdown
   - Optionally check "⭐ Highlight" for important updates
   - Click **✈️ Send Message to Customer**

### Viewing Messages
- The message panel shows all exchanges chronologically
- Each message displays:
  - Message type indicator (📬, 🎯, or 💬)
  - The message text
  - Timestamp of when it was sent
  - ⭐ indicator if highlighted

### Deleting Messages
- Click the **🗑** button on any message to delete it
- A confirmation dialog will appear before deletion

### Auto-Refresh
- Messages automatically refresh every 5 seconds
- No need to manually reload the page

## Database Schema

### Table: `order_messages`
```sql
- id (AUTO)
- order_ref (TEXT) - Links to order
- message (TEXT) - The message content
- message_type (TEXT) - 'update', 'milestone', or 'custom'
- is_highlighted (BOOLEAN) - Whether message is highlighted
- created_at (TIMESTAMP) - When message was created
```

## API Endpoints

### GET /api/admin/order-messages
**Fetch all messages for an order**
```
Query Parameters:
- orderRef (required): The order reference number

Response:
{
  "messages": [
    {
      "id": 1,
      "orderRef": "ORD-12345",
      "message": "Your order has been confirmed!",
      "messageType": "update",
      "isHighlighted": false,
      "createdAt": "2026-04-12T10:30:00Z"
    }
  ]
}
```

### POST /api/admin/send-order-message
**Send a new message**
```
Body:
{
  "orderRef": "ORD-12345",
  "message": "Your order has been confirmed!",
  "messageType": "update",
  "isHighlighted": false
}

Response:
{
  "success": true,
  "message": { ... }
}
```

### DELETE /api/admin/order-messages
**Delete a message**
```
Body:
{
  "messageId": 1
}

Response:
{
  "success": true
}
```

## UI/UX Details

### Compact Mode (Default in Order Cards)
- Shows as a gradient button with message count
- Displays number of highlighted messages
- Click to expand to full messaging panel
- Click X to collapse back

### Full Messaging Panel
- Beautiful gradient background (purple to pink)
- Shows message type icons
- Character counter for input
- Smooth animations and transitions
- Error messages clearly displayed
- Loading states with visual feedback

## Best Practices

1. **Use Update type** for general status updates
2. **Use Milestone type** for important progress points
3. **Use Highlight** sparingly for truly important messages
4. **Keep messages concise** but informative
5. **Send proactive updates** to reduce customer inquiries
6. **Avoid repetition** - check recent messages first

## Integration Points

- **ActiveOrdersDashboard**: Messages appear below each confirmed/in-transit order
- **API Auth**: Messages are admin-only (protected by isCurrentUserAdmin)
- **Order Lifecycle**: Messages are tied to order_ref with cascade delete when order is deleted

## Setup Required

1. Run the migration in `supabase-setup.sql` to create the `order_messages` table
2. API endpoints should be automatically available after file creation
3. No additional environment variables needed

```sql
-- Migration
create table order_messages (
  id              bigint generated always as identity primary key,
  order_ref       text not null,
  message         text not null,
  message_type    text not null default 'custom',
  is_highlighted  boolean not null default false,
  created_at      timestamptz not null default now(),
  
  constraint fk_order_messages_order
    foreign key (order_ref) references orders(order_ref) on delete cascade
);
```

## Technical Implementation

### Component: OrderMessaging.tsx
- Handles message loading, sending, and deletion
- Auto-refresh every 5 seconds
- Compact and expanded display modes
- Real-time validation and error handling

### Files Modified
- `supabase-setup.sql` - Added order_messages table
- `components/OrderMessaging.tsx` - Enhanced with new UI
- `components/ActiveOrdersDashboard.tsx` - Integrated messaging
- `app/api/admin/order-messages/route.ts` - GET & DELETE endpoints
- `app/api/admin/send-order-message/route.ts` - POST endpoint

## Future Enhancements (Optional)

- Customer-visible message history on order tracking page
- SMS notifications when messages are sent
- Message templates with pre-written responses
- Search/filter messages by type or date
- Bulk messaging to multiple orders
- Read receipts (if integrated with customer app)
