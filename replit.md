# COD Dashboard

## Overview
The COD Dashboard is a full-stack web application for comprehensive management of Cash on Delivery (COD) orders and business analytics. It aims to optimize COD operations through order tracking, customer management, real-time performance monitoring, and secure multi-role authentication. Key features include an AI-powered virtual agent (Sofia), integrated investment management, creative intelligence for Facebook Ads, an enterprise-grade visual editor (PageModelV4) with HTML conversion, a production-ready component library, and AI-powered page generation. The system supports various user roles (investors, suppliers, finance, administrators) to provide actionable business insights and streamline operations. The system now displays all currency values in their original currency from Shopify orders without conversion.

## Recent Changes (October 2025)
- **Simplified User Creation Modal - Operations Removed (Oct 25)**: Removed operation selection from user creation modal's step 1. The 2-step wizard now works as follows: Step 1 (basic info): name, email, password, role only. Step 2 (integrations): warehouse accounts configuration for role='user' only, without operation linkage during creation. Operations and operation-to-warehouse linking must be configured after user creation through the edit modal's "Operations" and "Warehouse" tabs. This simplifies the onboarding flow by removing the dependency of warehouse accounts on pre-selected operations during creation.
- **Warehouse Configuration Removed from User Onboarding (Oct 24)**: Completely removed warehouse/shipping provider configuration from user-facing onboarding flow. Warehouse setup is now exclusively an admin dashboard responsibility, aligning with Shopify-first architecture where operations can function with: (1) Shopify-only (no warehouse required), (2) Shopify + N1 Warehouse, or (3) Shopify + FHB prefix for centralized fulfillment tracking. Changes include: (1) Removed warehouse section from integrations page UI, (2) Eliminated step3_shipping from 5-step onboarding, renumbered to 4-step flow (operation → platform → ads → sync), (3) Removed hasWarehouse requirement from sync buttons across dashboard and orders pages, (4) Backend now hardcodes hasWarehouse=true and only checks platform+ads for completion, (5) Added automatic migration system that transparently converts legacy step IDs (step4_ads→step3_ads, step5_sync→step4_sync) when reading users from database, preserving existing completion status. Users can now sync orders immediately after connecting Shopify/platform without warehouse configuration blocking them.
- **Automatic Initial Sync for New FHB Accounts (Oct 23)**: Fixed critical bug where initial sync (1-2 year backfill) was not triggered when registering new FHB accounts in admin dashboard. System now automatically starts initial sync immediately after account creation using background worker trigger. Added visual status indicator in FHB accounts table showing "Em andamento..." (spinning loader) or "Concluído" (checkmark) for initial sync status. Backend enhancement: POST /api/admin/fhb-accounts now calls triggerInitialSync() asynchronously after successful account creation, ensuring complete order history is pulled without delay. Frontend enhancement: New "Initial Sync" column with real-time status display, improved toast message informing users sync has started automatically. This ensures new FHB integrations are operational immediately rather than waiting up to 1 hour for scheduled worker check.
- **Admin Orders Date Display Fallback (Oct 23)**: Fixed missing dates in admin orders table for records without orderDate. System now displays orderDate when available, otherwise falls back to createdAt timestamp. Prevents empty date cells for orders imported from non-Shopify sources or historical data migrations.
- **Admin Orders Table Enhancements (Oct 23)**: Added country flag emoji column using Unicode Regional Indicator Symbols for visual country identification. Simplified Operation column to display only operationName (removed storeName for cleaner view). Both changes improve data readability and reduce table clutter.
- **Shopify Prefix Configuration UI (Oct 22)**: Added configurable `shopifyOrderPrefix` field to Settings page enabling FHB linking worker to match staging orders to central database. Frontend includes input field with Hash icon, placeholder examples (P32, #52, A72), and descriptive help text. Backend updated with validation schema and settings endpoint to persist prefix. This field is critical for FHB sync: without correct prefix configured, linking worker cannot match FHB orders to Shopify orders in central database. Available prefixes from FHB: #52 (77k orders), #83 (35k), #BG (5.5k), #CR (5.4k), #19 (3.4k), A72 (1.1k), #P3 (334).
- **Native Locale Formatting (Oct 22)**: Implemented locale-aware currency formatting using native locales for each currency. System now formats values using the correct locale for each currency: PLN uses pl-PL (Polish), EUR uses de-DE (German/European standard), USD uses en-US (American), BRL uses pt-BR (Brazilian), etc. Added complete locale mapping for all 16 supported currencies covering Europe and Middle East. Each currency displays with its native number formatting (separators, decimal points, symbol placement).
- **Complete Currency Conversion Removal (Oct 22)**: Removed ALL currency conversion logic from dashboard-service.ts. System now displays values exclusively in the original currency from Shopify orders (PLN, EUR, USD, etc.) without any EUR→BRL or other conversions. Changes include: (1) Removed all `convertToBRLSync` and `convertToBRL` calls, (2) Set `shouldConvertCurrency` to always false, (3) Modified `calculateMetrics`, `calculateHistoricalRevenue`, `getRevenueOverTime` to skip conversion logic, (4) Fixed cached metrics retrieval to avoid conversion, (5) Kept legacy variable names like "*BRL" and "*EUR" for backward compatibility but they now contain original currency values. Dashboard now correctly displays PLN orders as PLN, EUR as EUR, etc. Critical fix for multi-currency operations where incorrect conversions were causing data accuracy issues.

## User Preferences
Preferred communication style: Simple, everyday language.
Quality priority: Maximum quality and highest level possible ("atingir o mais alto nivel possivel").

## System Architecture

### UI/UX
- **Frontend Framework**: React 18 with TypeScript and Vite.
- **Styling**: shadcn/ui (Radix UI primitives), Tailwind CSS (glassmorphism, dark theme), mobile-first adaptive layouts.
- **State Management**: Zustand (authentication).
- **Data Fetching**: React Query.
- **Routing**: Wouter.
- **Charts**: Recharts.
- **Forms**: React Hook Form with Zod.

### Technical Implementations
- **Backend Runtime**: Node.js with Express.js (TypeScript, ES modules).
- **Authentication**: JWT, bcryptjs, PostgreSQL-backed sessions.
- **Database ORM**: Drizzle ORM (PostgreSQL dialect).
- **API**: RESTful with structured error handling and logging.
- **Core System Features**: Multi-tenant architecture, Shopify-first data synchronization, instance-based fulfillment, gamified 5-step onboarding, and real-time sync progress tracking. Supports configurable timezones per operation.
- **AI Integration**:
    - **Customer Support**: OpenAI GPT-4 for automated, business-contextual responses.
    - **Sofia Virtual Agent**: Empathetic AI with Telnyx Voice API, emotional context analysis, dynamic prompt generation, and intelligent ticket creation.
    - **Creative Intelligence**: OpenAI GPT-4 for Facebook Ads creative analysis, recommendations, variant generation, and copywriting analysis.
    - **Intelligent Refund Management**: AI-powered customer retention using GPT-4 for progressive engagement.
- **Email System**: Professional HTML templates, multilingual support, threading, and smart keyword detection.
- **Shipping Integration**: European Fulfillment Center API for lead creation, status tracking, product management, and country selection, with JWT authentication. Implemented operation-level authorization and dynamic routing to warehouses (FHB vs N1 Warehouse).
- **Fulfillment Sync**: Centralized FHB sync system with 3-tier strategy (Initial, Deep, Fast Sync), staging table architecture, automatic window splitting for large datasets, and robust data quality validation.
- **Voice System**: Telnyx Voice API (PT-BR gather-only architecture) for Sofia's outbound calling and real-time PT-BR speech recognition.
- **Affiliate Program System**: Enterprise-grade affiliate marketing with JWT-signed tracking links, centralized landing page hosting on Vercel, and anti-fraud protection.
- **Visual Editor V4 (Native)**: PageModelV4-native visual editor with drag-and-drop functionality, preserving HTML fidelity, responsive styles, and semantic structure. Features recursive renderer, layers panel, properties panel, and semantic validation.
- **HTML-to-PageModel Converter V4**: 100% fidelity converter with recursive node architecture, enhanced CSS parser, layout property extraction, and semantic HTML preservation.
- **PageModelV4 Architecture**: Universal recursive node system preserving tag, type, attributes, classNames, inlineStyles, responsive styles, states, layout metadata, children, animations, transitions, and pseudoElements.

### System Design Choices
- **Database Schema**: UUID primary keys, automatic timestamps, decimal precision for financial data. Tables for users, orders, metrics, fulfillment leads, products, shipping providers, investment pools, investor profiles, investments, transactions, performance history, and intelligent refund requests.
- **Authentication & Authorization**: Role-based access control (Admin, user, investor, supplier, finance, affiliate) with frontend route guards and strict tenant isolation. Operation-level webhook isolation prevents cross-operation data leakage.
- **Security**: JWT tokens stored in HTTP-only cookies, bcrypt hashing for passwords.
- **Tracking System**: JWT tokens with 90-day expiration, IP-based deduplication, user agent tracking, referrer capture, landing URL logging, order attribution, commission calculation, and duplicate prevention.
- **Landing Pages**: Centralized Vercel hosting with automatic tracking pixel injection, HTML/CSS/JS storage, draft/active/archived states, and admin-controlled deployment.

## External Dependencies

- **PostgreSQL**: Used for data storage via `@neondatabase/serverless`.
- **Drizzle ORM**: For type-safe ORM operations and schema management.
- **TanStack Query**: For server state management and caching.
- **Zod**: For schema validation and type safety.
- **node-fetch**: For HTTP client operations.
- **Radix UI**: For accessible UI component primitives.
- **Tailwind CSS**: For utility-first styling.
- **Recharts**: For data visualization.
- **Lucide React**: For icons.
- **jsonwebtoken & bcryptjs**: For authentication and password security.
- **connect-pg-simple**: For PostgreSQL session store.
- **European Fulfillment API**: For shipping lead creation, status tracking, and product management.
- **Facebook Ads API**: For account management, campaign synchronization, and dynamic marketing cost calculation.
- **OpenAI GPT-4**: For AI-powered customer support, Sofia virtual agent, and creative intelligence.
- **Telnyx Voice API**: For the voice capabilities of the Sofia virtual agent.