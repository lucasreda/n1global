# COD Dashboard

## Overview
The COD Dashboard is a full-stack web application designed for comprehensive management of Cash on Delivery (COD) orders and business analytics. Its primary purpose is to optimize COD operations through features like order tracking, customer management, real-time performance monitoring, and secure multi-role authentication. Key capabilities include an AI-powered virtual agent (Sofia), integrated investment management, creative intelligence for Facebook Ads, an enterprise-grade visual editor (PageModelV4) with HTML conversion, a production-ready component library, and AI-powered page generation. The system supports various user roles (investors, suppliers, finance, administrators) to provide actionable business insights and streamline operations, now displaying all currency values in their original currency from Shopify orders without conversion.

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
- **AI Integration**: OpenAI GPT-4 for customer support, the Sofia virtual agent (with Telnyx Voice API, emotional context analysis, dynamic prompt generation, and intelligent ticket creation), creative intelligence for Facebook Ads, and intelligent refund management.
- **Email System**: Professional HTML templates, multilingual support, threading, and smart keyword detection.
- **Shipping Integration**: European Fulfillment Center API for lead creation, status tracking, product management, and country selection, with JWT authentication, operation-level authorization, and dynamic routing to warehouses.
- **Fulfillment Sync**: Centralized FHB sync system with a 3-tier strategy (Initial, Deep, Fast Sync), staging table architecture, automatic window splitting for large datasets, and robust data quality validation. This includes automated sync workers for FHB, European Fulfillment, and eLogy, with standardized scheduling and reentrancy guards. Staging sync service features per-user progress tracking with Map-based isolation, preventing cross-tenant data leakage and enabling concurrent syncs across different users while preventing same-user double-clicks.
- **Voice System**: Telnyx Voice API (PT-BR gather-only architecture) for Sofia's outbound calling and real-time PT-BR speech recognition.
- **Affiliate Program System**: Enterprise-grade affiliate marketing with JWT-signed tracking links, centralized landing page hosting on Vercel, and anti-fraud protection.
- **Visual Editor V4 (Native)**: PageModelV4-native visual editor with drag-and-drop functionality, preserving HTML fidelity, responsive styles, and semantic structure, including recursive renderer, layers panel, properties panel, and semantic validation.
- **HTML-to-PageModel Converter V4**: 100% fidelity converter with recursive node architecture, enhanced CSS parser, layout property extraction, and semantic HTML preservation.
- **PageModelV4 Architecture**: Universal recursive node system preserving tag, type, attributes, classNames, inlineStyles, responsive styles, states, layout metadata, children, animations, transitions, and pseudoElements.

### System Design Choices
- **Database Schema**: UUID primary keys, automatic timestamps, decimal precision for financial data. Tables cover users, orders, metrics, fulfillment leads, products, shipping providers, investment pools, investor profiles, investments, transactions, performance history, and intelligent refund requests.
- **Warehouse Account Management**: User-level warehouse integrations (FHB, European Fulfillment, eLogy) with multi-account support per user. Foreign key constraints use ON DELETE CASCADE - when a user is deleted, all their warehouse accounts are automatically deleted (along with account-operation links). Staging order tables use ON DELETE SET NULL to preserve order history when accounts are deleted (orders become orphaned but remain queryable).
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