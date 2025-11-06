# StreamSmart Pricing & Stripe Integration Plan

## 📋 Table of Contents
1. [Overview](#overview)
2. [Pricing Tiers](#pricing-tiers)
3. [Stripe Setup](#stripe-setup)
4. [Technical Architecture](#technical-architecture)
5. [Implementation Phases](#implementation-phases)
6. [API Endpoints](#api-endpoints)
7. [Database Schema](#database-schema)
8. [Frontend Components](#frontend-components)
9. [Security & Compliance](#security--compliance)
10. [Testing Strategy](#testing-strategy)
11. [Deployment Checklist](#deployment-checklist)

---

## Overview

### Goals
- Implement subscription-based pricing model
- Integrate Stripe for secure payment processing
- Provide tiered access to StreamSmart features
- Enable seamless upgrade/downgrade flow
- Track usage and billing cycles

### Key Features
- ✅ Multiple subscription tiers (Free, Pro, Enterprise)
- ✅ Stripe Checkout for payment collection
- ✅ Webhook handling for subscription events
- ✅ Customer portal for subscription management
- ✅ Usage-based billing for Enterprise tier
- ✅ Trial periods for paid plans
- ✅ Proration on plan changes

---

## Pricing Tiers

### 🆓 Free Tier
**Price:** $0/month

**Features:**
- 5 video transcripts per month
- Basic recommendations
- Limited playlist creation (3 playlists)
- Community support
- No RAG chatbot access
- Standard video tracking

**Limits:**
- `maxTranscripts`: 5
- `maxPlaylists`: 3
- `chatbotAccess`: false
- `advancedAnalytics`: false

### 💎 Pro Tier
**Price:** $9.99/month or $99/year (2 months free)

**Features:**
- Unlimited video transcripts
- Advanced AI recommendations
- Unlimited playlists
- Priority support
- Full RAG chatbot access
- Advanced analytics
- Multi-video context analysis
- Export transcripts (PDF, TXT)
- Browser extension premium features

**Limits:**
- `maxTranscripts`: unlimited
- `maxPlaylists`: unlimited
- `chatbotAccess`: true
- `advancedAnalytics`: true
- `exportFormats`: ['pdf', 'txt', 'json']

### 🏢 Enterprise Tier
**Price:** Custom (starting at $49/month)

**Features:**
- Everything in Pro
- Team collaboration (up to 10 users)
- API access (10,000 requests/month)
- Custom integrations
- Dedicated account manager
- SLA guarantee (99.9% uptime)
- White-labeling options
- Advanced security features
- Custom model fine-tuning

**Limits:**
- `teamMembers`: 10
- `apiRequests`: 10000
- `customIntegrations`: true
- `slaGuarantee`: true

---

## Stripe Setup

### 1. Create Stripe Account
```bash
# Sign up at https://stripe.com
# Get API keys from Dashboard > Developers > API keys
```

### 2. Environment Variables
```env
# .env.local
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Production
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Create Products in Stripe Dashboard

**Pro Plan (Monthly)**
- Product Name: "StreamSmart Pro - Monthly"
- Price: $9.99/month
- Billing Period: Monthly
- Metadata: `{ tier: "pro", interval: "month" }`

**Pro Plan (Annual)**
- Product Name: "StreamSmart Pro - Annual"
- Price: $99/year
- Billing Period: Yearly
- Metadata: `{ tier: "pro", interval: "year" }`

**Enterprise Plan**
- Product Name: "StreamSmart Enterprise"
- Price: Custom/Contact Sales
- Metadata: `{ tier: "enterprise", custom: true }`

### 4. Configure Stripe Settings
- ✅ Enable Customer Portal
- ✅ Set up Tax Collection (if needed)
- ✅ Configure Email Receipts
- ✅ Set up Billing Portal customization
- ✅ Enable SCA (Strong Customer Authentication)

---

## Technical Architecture

### Stack Components

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  Pricing   │  │   Checkout   │  │    Account     │  │
│  │    Page    │  │     Flow     │  │    Settings    │  │
│  └────────────┘  └──────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   API Routes (Next.js)                   │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  Checkout  │  │   Webhooks   │  │    Portal      │  │
│  │  Session   │  │   Handler    │  │    Session     │  │
│  └────────────┘  └──────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                      Stripe API                          │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  Products  │  │ Subscriptions│  │    Webhooks    │  │
│  │   Prices   │  │   Customers  │  │     Events     │  │
│  └────────────┘  └──────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                Database (DynamoDB/MongoDB)               │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │   Users    │  │Subscriptions │  │     Usage      │  │
│  │            │  │              │  │    Tracking    │  │
│  └────────────┘  └──────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Set up Stripe account and products
- [ ] Install Stripe SDK (`npm install stripe @stripe/stripe-js`)
- [ ] Create environment configuration
- [ ] Set up basic database schema for subscriptions
- [ ] Create pricing plans constants/config

### Phase 2: Backend API (Week 2-3)
- [ ] Create Stripe checkout session endpoint
- [ ] Create webhook handler for subscription events
- [ ] Create customer portal session endpoint
- [ ] Implement subscription status checking middleware
- [ ] Add usage tracking endpoints
- [ ] Create admin endpoints for subscription management

### Phase 3: Frontend UI (Week 3-4)
- [ ] Design and build pricing page
- [ ] Create checkout flow components
- [ ] Build subscription management dashboard
- [ ] Add upgrade/downgrade modals
- [ ] Implement feature gating based on subscription
- [ ] Create billing history view

### Phase 4: Integration (Week 4-5)
- [ ] Integrate Stripe with authentication system
- [ ] Add subscription checks to protected routes
- [ ] Implement feature toggles based on tier
- [ ] Add usage metering for Enterprise tier
- [ ] Create subscription expiry/renewal flows
- [ ] Add trial period logic

### Phase 5: Testing & Polish (Week 5-6)
- [ ] Test all payment flows (success, failure, cancellation)
- [ ] Test webhook handling
- [ ] Test proration calculations
- [ ] Perform security audit
- [ ] Add error handling and user feedback
- [ ] Create documentation

### Phase 6: Launch Preparation (Week 6-7)
- [ ] Switch to production Stripe keys
- [ ] Set up monitoring and alerting
- [ ] Create customer support documentation
- [ ] Prepare marketing materials
- [ ] Set up analytics tracking
- [ ] Launch beta testing with select users

---

## API Endpoints

### POST `/api/stripe/create-checkout-session`
**Purpose:** Create Stripe checkout session for subscription

**Request Body:**
```typescript
{
  priceId: string;        // Stripe price ID
  successUrl: string;     // Redirect URL on success
  cancelUrl: string;      // Redirect URL on cancel
  customerId?: string;    // Existing Stripe customer ID
}
```

**Response:**
```typescript
{
  sessionId: string;
  url: string;           // Stripe Checkout URL
}
```

### POST `/api/stripe/webhook`
**Purpose:** Handle Stripe webhook events

**Events to Handle:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.updated`
- `checkout.session.completed`

**Response:**
```typescript
{
  received: true;
}
```

### POST `/api/stripe/create-portal-session`
**Purpose:** Create customer portal session for subscription management

**Request Body:**
```typescript
{
  customerId: string;
  returnUrl: string;
}
```

**Response:**
```typescript
{
  url: string;           // Stripe Portal URL
}
```

### GET `/api/subscription/status`
**Purpose:** Get current user's subscription status

**Response:**
```typescript
{
  tier: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}
```

### GET `/api/subscription/usage`
**Purpose:** Get current usage statistics

**Response:**
```typescript
{
  transcripts: {
    used: number;
    limit: number;
  };
  playlists: {
    used: number;
    limit: number;
  };
  apiRequests?: {
    used: number;
    limit: number;
  };
}
```

### POST `/api/subscription/upgrade`
**Purpose:** Upgrade subscription plan

**Request Body:**
```typescript
{
  newPriceId: string;
  prorationBehavior: 'create_prorations' | 'none';
}
```

### POST `/api/subscription/cancel`
**Purpose:** Cancel subscription (at period end)

**Response:**
```typescript
{
  success: boolean;
  cancelAt: string;
}
```

---

## Database Schema

### Users Collection/Table Enhancement
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  
  // Subscription fields
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  subscriptionStatus: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date;
  
  // Usage tracking
  usage: {
    transcripts: number;
    playlists: number;
    apiRequests?: number;
    lastResetDate: Date;
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}
```

### Subscriptions Table (Optional - for history)
```typescript
interface SubscriptionHistory {
  id: string;
  userId: string;
  stripeSubscriptionId: string;
  tier: 'free' | 'pro' | 'enterprise';
  status: string;
  startDate: Date;
  endDate?: Date;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

### Invoices Table
```typescript
interface Invoice {
  id: string;
  userId: string;
  stripeInvoiceId: string;
  amount: number;
  currency: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  invoiceUrl: string;
  pdfUrl: string;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
}
```

### Usage Events Table
```typescript
interface UsageEvent {
  id: string;
  userId: string;
  eventType: 'transcript' | 'playlist' | 'api_request' | 'chat_message';
  metadata: Record<string, any>;
  timestamp: Date;
}
```

---

## Frontend Components

### 1. Pricing Page Component
**Location:** `src/app/pricing/page.tsx`

```typescript
// Features:
// - Display all pricing tiers in cards
// - Highlight recommended plan (Pro)
// - Show annual discount
// - Feature comparison table
// - FAQ section
// - Call-to-action buttons for each tier
```

### 2. Checkout Flow Components

**PricingCard Component** (`src/components/pricing/pricing-card.tsx`)
```typescript
interface PricingCardProps {
  tier: 'free' | 'pro' | 'enterprise';
  price: number | 'Custom';
  interval?: 'month' | 'year';
  features: string[];
  highlighted?: boolean;
  currentTier: string;
  onSelect: () => void;
}
```

**CheckoutButton Component** (`src/components/pricing/checkout-button.tsx`)
```typescript
interface CheckoutButtonProps {
  priceId: string;
  tierName: string;
  disabled?: boolean;
}
```

### 3. Subscription Management Components

**SubscriptionDashboard** (`src/components/subscription/dashboard.tsx`)
```typescript
// Features:
// - Current plan details
// - Billing cycle information
// - Next payment date
// - Usage statistics with progress bars
// - Upgrade/downgrade buttons
// - Cancel subscription button
// - View billing history
```

**UsageDisplay** (`src/components/subscription/usage-display.tsx`)
```typescript
interface UsageDisplayProps {
  type: 'transcripts' | 'playlists' | 'api_requests';
  used: number;
  limit: number | 'unlimited';
}
```

**BillingHistory** (`src/components/subscription/billing-history.tsx`)
```typescript
// Features:
// - List of past invoices
// - Download invoice PDF
// - Payment status
// - Date and amount
```

### 4. Feature Gate Components

**FeatureGate Component** (`src/components/subscription/feature-gate.tsx`)
```typescript
interface FeatureGateProps {
  requiredTier: 'pro' | 'enterprise';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// Usage:
<FeatureGate requiredTier="pro" fallback={<UpgradePrompt />}>
  <AdvancedFeature />
</FeatureGate>
```

**UpgradeModal** (`src/components/subscription/upgrade-modal.tsx`)
```typescript
// Features:
// - Show when user hits feature limit
// - Display benefits of upgrading
// - Quick upgrade button
// - Dismissible
```

---

## Security & Compliance

### 1. Webhook Security
```typescript
// Verify webhook signatures
import { headers } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature')!;
  
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    
    // Process event
  } catch (err) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }
}
```

### 2. Idempotency
```typescript
// Add idempotency keys to prevent duplicate charges
const session = await stripe.checkout.sessions.create(
  {
    // ... session config
  },
  {
    idempotencyKey: `checkout_${userId}_${Date.now()}`
  }
);
```

### 3. PCI Compliance
- ✅ Never store card details (use Stripe)
- ✅ Use Stripe Checkout or Elements
- ✅ Implement SCA (handled by Stripe)
- ✅ Use HTTPS for all endpoints

### 4. Data Protection
- ✅ Encrypt sensitive data at rest
- ✅ Use environment variables for secrets
- ✅ Implement rate limiting on API endpoints
- ✅ Log all subscription changes
- ✅ Regular security audits

---

## Testing Strategy

### 1. Test Cards (Stripe Test Mode)
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
SCA Required: 4000 0025 0000 3155
Insufficient Funds: 4000 0000 0000 9995
```

### 2. Test Scenarios

**Subscription Creation**
- [ ] New user signs up for Pro monthly
- [ ] New user signs up for Pro annual
- [ ] Free user upgrades to Pro
- [ ] Test with different currencies

**Payment Failures**
- [ ] Card declined during signup
- [ ] Payment fails during renewal
- [ ] Customer updates payment method
- [ ] Retry logic for failed payments

**Plan Changes**
- [ ] Upgrade from Free to Pro
- [ ] Upgrade from Pro monthly to annual
- [ ] Downgrade from Pro to Free
- [ ] Test proration calculations

**Cancellations**
- [ ] Cancel immediately
- [ ] Cancel at period end
- [ ] Reactivate canceled subscription
- [ ] Test access after cancellation

**Edge Cases**
- [ ] Webhook arrives out of order
- [ ] Duplicate webhook events
- [ ] User deletes account with active subscription
- [ ] Subscription expires during user session

### 3. Automated Tests
```typescript
// Example test
describe('Stripe Integration', () => {
  it('creates checkout session successfully', async () => {
    const response = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({
        priceId: 'price_test_123',
        successUrl: 'https://app.streamsmart.com/success',
        cancelUrl: 'https://app.streamsmart.com/cancel',
      }),
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.sessionId).toBeDefined();
  });
});
```

---

## Deployment Checklist

### Pre-Launch
- [ ] Complete end-to-end testing in test mode
- [ ] Review all pricing and product details
- [ ] Set up production Stripe account
- [ ] Configure production webhook endpoint
- [ ] Update environment variables with production keys
- [ ] Test webhook delivery to production endpoint
- [ ] Set up monitoring and alerts
- [ ] Prepare customer support documentation
- [ ] Create cancellation flow documentation
- [ ] Set up backup payment method collection

### Launch Day
- [ ] Deploy to production
- [ ] Verify webhook connectivity
- [ ] Test one real transaction (refund after)
- [ ] Monitor error logs
- [ ] Monitor Stripe Dashboard
- [ ] Have team on standby for issues

### Post-Launch
- [ ] Monitor subscription metrics daily
- [ ] Track conversion rates
- [ ] Gather user feedback
- [ ] Monitor churn rate
- [ ] Optimize pricing based on data
- [ ] A/B test pricing page variations

---

## Code Examples

### Creating Checkout Session
```typescript
// src/app/api/stripe/create-checkout-session/route.ts
import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getServerSession } from 'next-auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { priceId } = await req.json();

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      customer_email: session.user.email,
      metadata: {
        userId: session.user.id,
      },
    });

    return Response.json({ sessionId: checkoutSession.id, url: checkoutSession.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return Response.json({ error: 'Failed to create checkout' }, { status: 500 });
  }
}
```

### Webhook Handler
```typescript
// src/app/api/stripe/webhook/route.ts
import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = headers().get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object as Stripe.Subscription;
      await updateUserSubscription(subscription);
      break;

    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionCancellation(deletedSubscription);
      break;

    case 'invoice.payment_failed':
      const failedInvoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailure(failedInvoice);
      break;
  }

  return Response.json({ received: true });
}
```

### Feature Gate Hook
```typescript
// src/hooks/useSubscription.ts
import { useSession } from 'next-auth/react';
import useSWR from 'swr';

export function useSubscription() {
  const { data: session } = useSession();
  const { data, error, mutate } = useSWR(
    session ? '/api/subscription/status' : null,
    fetcher
  );

  const hasFeature = (feature: string) => {
    if (!data) return false;
    
    const features = {
      free: ['basic_transcripts', 'limited_playlists'],
      pro: ['unlimited_transcripts', 'chatbot', 'analytics', 'export'],
      enterprise: ['team_collaboration', 'api_access', 'custom_integration'],
    };

    return features[data.tier]?.includes(feature) || false;
  };

  return {
    subscription: data,
    isLoading: !data && !error,
    hasFeature,
    refetch: mutate,
  };
}
```

---

## Metrics to Track

### Business Metrics
- Monthly Recurring Revenue (MRR)
- Annual Recurring Revenue (ARR)
- Customer Lifetime Value (LTV)
- Customer Acquisition Cost (CAC)
- Churn Rate (monthly)
- Conversion Rate (free → paid)
- Trial-to-paid conversion rate
- Average Revenue Per User (ARPU)

### Technical Metrics
- Checkout success rate
- Webhook delivery success rate
- API response times
- Payment failure rate
- Refund rate
- Failed payment recovery rate

### User Metrics
- Free tier usage patterns
- Feature adoption rates
- Time to first upgrade
- Downgrade reasons
- Cancellation reasons

---

## Resources & Documentation

### Stripe Documentation
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [Webhooks](https://stripe.com/docs/webhooks)
- [Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [Testing](https://stripe.com/docs/testing)

### Next.js Integration
- [Next.js + Stripe Example](https://github.com/vercel/next.js/tree/canary/examples/with-stripe-typescript)
- [API Routes Documentation](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

### Best Practices
- Always use webhook events as source of truth
- Implement idempotency for all payment operations
- Store minimal customer data
- Use Stripe Customer Portal for self-service
- Monitor webhook delivery and retry failed events
- Implement proper error handling and logging

---

## Notes & Considerations

1. **Tax Compliance**: Consider using Stripe Tax for automatic tax calculation
2. **Localization**: Support multiple currencies for international customers
3. **Trials**: Offer 14-day free trial for Pro tier to increase conversions
4. **Discounts**: Create promo codes for marketing campaigns
5. **Annual Plans**: Offer discount (2 months free) to encourage annual subscriptions
6. **Grandfather Clause**: Honor original pricing for early adopters
7. **Referral Program**: Consider adding referral credits in future
8. **Usage Alerts**: Notify users when approaching limits
9. **Payment Retries**: Stripe automatically retries failed payments
10. **Customer Support**: Train team on handling subscription issues

---

**Last Updated:** November 6, 2025  
**Version:** 1.0  
**Status:** Ready for Implementation
