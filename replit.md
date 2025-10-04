# COD Dashboard

## Overview
The COD Dashboard is a full-stack web application for managing Cash on Delivery (COD) orders and business metric analysis. It offers order tracking, customer management, performance monitoring with real-time data visualization, and secure authentication. Key capabilities include AI-powered customer support, an empathetic virtual agent (Sofia) with intelligent voice capabilities, comprehensive investment management, and creative intelligence tools for analyzing Facebook Ads performance with AI-driven recommendations. The system supports multi-role access (investors, suppliers, finance, administrators) and aims to provide businesses with efficient COD operations and actionable insights.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript and Vite
- **UI**: shadcn/ui (Radix UI primitives), Tailwind CSS (glassmorphism, dark theme), mobile-first adaptive layouts.
- **State Management**: Zustand (authentication)
- **Data Fetching**: React Query
- **Routing**: Wouter
- **Charts**: Recharts
- **Forms**: React Hook Form with Zod

### Backend
- **Runtime**: Node.js with Express.js (TypeScript, ES modules)
- **Authentication**: JWT, bcryptjs
- **Data Storage**: PostgreSQL (via Drizzle ORM), in-memory for some parts, PostgreSQL for sessions.
- **API**: RESTful, structured error handling, logging.
- **Core Features**: Multi-tenant architecture, Shopify-first data sync, instance-based fulfillment, gamified 5-step onboarding, real-time sync progress tracking.
- **AI Integration**:
    - **Customer Support**: OpenAI GPT-4 for automatic responses with business context.
    - **Sofia Virtual Agent**: Empathetic AI with voice capabilities (Telnyx Voice API), emotional context analysis, dynamic prompt generation, adaptive response tone, intelligent ticket creation.
    - **Creative Intelligence**: OpenAI GPT-4 for Facebook Ads creative analysis (insights, recommendations, variant generation), real-time SSE for progress, cost estimation, batch processing, comprehensive metrics, and advanced copywriting analysis.
    - **Intelligent Refund Management**: AI-powered customer retention system with progressive engagement strategy (retention, escalation, refund form), critical keyword detection, and adaptive responses using GPT-4.
- **Email System**: Professional HTML templates, multilingual, Reply-To configuration, threading, smart keyword detection for automated responses, and universal auto-confirmation for incoming support emails.

### Database
- **ORM**: Drizzle ORM (PostgreSQL dialect).
- **Schema**: Tables for users, orders, metrics, fulfillment leads, products, shipping providers, investment pools, investor profiles, investments, transactions, performance history, and intelligent refund requests.
- **Features**: UUID primary keys, automatic timestamps, decimal precision.

### Authentication & Authorization
- **Strategy**: JWT tokens (HTTP-only cookies), bcrypt hashing, PostgreSQL-backed sessions.
- **Roles**: Admin, user, investor, supplier, finance, affiliate with different access levels.
- **Security**: Frontend route guards, token-based API requests, strict tenant isolation.

### Shipping Integration
- **Provider**: European Fulfillment Center API for lead creation, status tracking, product management, and country selection, with JWT-based API authentication and token caching.

### Voice System
- **Provider**: Telnyx Voice API (PT-BR gather-only architecture).
- **Virtual Agent**: Sofia (AI-powered sales and support) for outbound calling, real-time PT-BR speech recognition, and adaptive responses.

### Affiliate Program System
- **Architecture**: Enterprise-grade affiliate marketing system with JWT-signed tracking links, centralized landing page hosting, and anti-fraud protection.
- **Database**: 8 dedicated tables for affiliate profiles, memberships, conversions, commission rules, payouts, clicks, deployment configuration, and landing pages.
- **Core Services**: 
  - AffiliateService for profiles/product catalog/membership/stats/landing page assignment
  - AffiliateTrackingService for JWT-signed link generation, click/conversion tracking, and fraud detection
  - AffiliateCommissionService for commission calculation, approval workflow, and payout generation
  - AffiliateLandingService for landing page CRUD operations
  - AffiliateVercelDeployService for centralized Vercel deployments with automatic pixel injection
- **Authentication**: "affiliate" role with dedicated route guards.
- **Tracking System**: JWT tokens with 90-day expiration, IP-based deduplication, user agent tracking, referer capture, landing URL logging, order attribution, commission calculation, and duplicate prevention.
- **Landing Pages**: Centralized Vercel hosting with single platform account, automatic tracking pixel injection, HTML/CSS/JS storage, draft/active/archived states, admin-controlled deployment and affiliate assignment.
- **Anti-Fraud**: IP deduplication, membership verification, duplicate conversion prevention, JWT expiration.

### Visual Editor
- **Functionality**: Supports editing of AI-generated pages, with an adapter to ensure compatibility with `PageModelV2` (hierarchical structure) from legacy `PageModel`.
- **Data Safety**: Preserves unknown fields as hidden metadata, provides console warnings for legacy conversions, and includes a visual warning banner.
- **AI Page Generation**: Robust handling of AI page generation, including real-time SSE progress tracking and persistent storage of generated pages to the database.

## External Dependencies

- **PostgreSQL**: Via `@neondatabase/serverless`.
- **Drizzle ORM**: For type-safe ORM and migration management.
- **TanStack Query**: For server state management and caching.
- **Zod**: For schema validation and type safety.
- **node-fetch**: For HTTP client operations.
- **Radix UI**: For accessible UI component primitives.
- **Tailwind CSS**: For utility-first styling.
- **Recharts**: For data visualization.
- **Lucide React**: For icons.
- **jsonwebtoken & bcryptjs**: For authentication and password security.
- **connect-pg-simple**: For PostgreSQL session store.
- **European Fulfillment API**: For complete synchronization and smart sync capabilities.
- **Facebook Ads API**: For account management, campaign synchronization, and dynamic marketing cost calculation.
- **OpenAI GPT-4**: For AI-powered automatic responses, Sofia virtual agent, and creative intelligence analysis.
- **Telnyx Voice API**: For voice capabilities of the Sofia virtual agent.
## Recent Changes (October 4, 2025)

### Affiliate Program System - Phase 6 Complete ✅
**Status**: Centralized landing page hosting system operational with Vercel deployment

**Completed Work**:
1. **Phase 1 - Database Schema (Complete)**:
   - Created 7 new tables for affiliate system (profiles, memberships, conversions, commission rules, payouts, clicks, Vercel config)
   - Extended orders table with affiliate tracking fields (affiliateId, affiliateTrackingId, landingSource)
   - All tables use optimized indexes for performance

2. **Phase 2 - Authentication & Authorization (Complete)**:
   - Added "affiliate" role to user roles enum
   - Created middleware guards: `requireAffiliate`, `requireAffiliateOrAdmin`
   - Updated frontend auth store to support affiliate role

3. **Phase 3 - Core Affiliate Service (Complete)**:
   - `AffiliateService` class with full CRUD operations for profiles
   - Product catalog browsing for affiliates
   - Membership management (affiliate joins product/operation)
   - Dashboard statistics (clicks, conversions, commissions)
   - API routes registered at `/api/affiliate/*`

4. **Phase 4 - Tracking System (Complete)**:
   - `AffiliateTrackingService` with JWT-signed link generation
   - Click registration with anti-fraud protection (IP deduplication, 24h window)
   - Conversion tracking with automatic order attribution
   - Public endpoints for external checkouts to report conversions
   - Token verification API for checkout integrations
   - API routes registered at `/api/affiliate/tracking/*`

5. **Phase 5 - Commission Engine (Complete)**:
   - `AffiliateCommissionService` with automatic commission calculation
   - Commission calculation based on hierarchy: custom membership % > commission rule % > default 10%
   - Conversion approval/rejection workflow (admin only)
   - Bulk approval support for multiple conversions
   - Automatic payout generation grouping approved conversions
   - Payout status management (pending → paid)
   - Commission rules CRUD (operation-level and product-level rules)
   - API routes registered at `/api/affiliate/commission/*`

6. **Phase 6 - Centralized Vercel Landing Pages (Complete)**:
   - Centralized architecture: Single platform Vercel account hosts all affiliate landing pages
   - `affiliate_landing_pages` table for HTML/CSS/JS storage with draft/active/archived states
   - `AffiliateLandingService` for CRUD operations on landing page templates
   - `AffiliateVercelDeployService` for automated deployment with pixel injection
   - Automatic tracking pixel injection before `</body>` tag during deployment
   - Landing page assignment system linking affiliates to deployed pages
   - Admin endpoints for landing page management (create, update, activate, archive, deploy)
   - Admin endpoints for affiliate assignment (deploy + assign, unassign)
   - Affiliate pixel configuration endpoint (PATCH /api/affiliate/tracking-pixel)
   - API routes registered at `/api/affiliate/landing-pages/*`

**Technical Implementation**:
- JWT tokens with 90-day expiration for tracking links
- Comprehensive metadata capture (IP, user agent, referer, landing URL)
- Membership verification for conversions
- Duplicate prevention at both click and conversion levels
- Real-time statistics calculation with SQL aggregations
- Centralized Vercel deployment with pixel injection
- Landing page versioning (draft → active → archived)
- Affiliate profile fields: trackingPixel, landingPageUrl, landingPageId

**Next Phases** (Pending):
- Phase 7: External Checkout SDK (JavaScript SDK for external sites)
- Phase 8: Vercel-hosted Checkout (Next.js template)
- Phase 9: Affiliate Dashboard UI (React frontend)
- Phase 10: Admin Panel (affiliate approval, commission config, payout management)
- Phase 11: Security & Anti-Fraud (rate limiting, advanced fraud detection)
- Phase 12: End-to-End Testing (seed data, full flow validation)

**Files Modified/Created**:
- `shared/schema.ts`: Affiliate tables, types, and landing pages table
- `server/affiliate-service.ts`: Core affiliate business logic + landing page assignment methods
- `server/affiliate-routes.ts`: Affiliate API endpoints + pixel config + landing assignment
- `server/affiliate-tracking-service.ts`: Tracking and link generation
- `server/affiliate-tracking-routes.ts`: Tracking API endpoints (public + protected)
- `server/affiliate-commission-service.ts`: Commission calculation engine
- `server/affiliate-commission-routes.ts`: Commission management API endpoints
- `server/affiliate-landing-service.ts`: Landing page CRUD operations
- `server/affiliate-landing-routes.ts`: Landing page management endpoints
- `server/affiliate-vercel-deploy-service.ts`: Vercel deployment with pixel injection
- `server/auth-middleware.ts`: Affiliate role guards
- `server/routes.ts`: Route registration
- `client/src/lib/auth.ts`: Frontend role support
