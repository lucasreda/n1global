# COD Dashboard

## Overview
The COD Dashboard is a full-stack web application designed for comprehensive management of Cash on Delivery (COD) orders and business analytics. Its core purpose is to optimize COD operations by offering order tracking, customer management, real-time performance monitoring, and secure multi-role authentication. Key capabilities include an empathetic AI-powered virtual agent, integrated investment management, creative intelligence for Facebook Ads, an enterprise-grade visual editor (PageModelV4) with HTML conversion and style preservation, a production-ready component library, and AI-powered page generation. The system supports various user roles (investors, suppliers, finance, administrators) to provide actionable business insights and streamline operations.

## Recent Changes (October 2025)
- **Operation-Level Webhook Isolation (Oct 20)**: Implemented strict operation-level isolation for external webhook system. Each operation's webhook configuration now only fires for orders from that specific operation, preventing cross-operation email spam. Added unique constraint on (userId, operationId, integrationType) to prevent duplicate configurations. Enhanced security by redacting webhook secrets from request logs.
- **Configurable Timezone per Operation (Oct 16)**: Implemented timezone configuration at the operation level. Users can now set their operation's timezone in settings (e.g., Europe/Madrid, Europe/Rome, Europe/Lisbon). All dashboard metrics, sync operations, and date filtering respect the configured timezone instead of using hardcoded values.
- **Timezone-Aware Dashboard (Oct 16)**: Implemented timezone-aware date filtering across all dashboard queries. Dashboard now correctly filters orders using the operation's timezone (e.g., Europe/Madrid for Spain) instead of UTC, ensuring accurate "today" filtering and metrics calculation.
- **SQL Query Optimization (Oct 16)**: Migrated complex timezone aggregation queries from Drizzle ORM to raw SQL with Common Table Expressions (CTEs) to resolve PostgreSQL GROUP BY errors. This ensures consistent timezone conversion in both SELECT and GROUP BY clauses.
- **Currency Display**: Dashboard now displays all metrics in the operation's configured currency (EUR, BRL, USD) without any currency conversions. Each operation has its own currency setting, and all dashboard values are formatted accordingly using the `formatOperationCurrency` utility function.
- **Code Cleanup**: Removed unused currency formatting functions (`formatCurrencyBRL`, `formatCurrencyEUR`) from utils to prevent confusion and maintain a single source of truth for currency formatting.

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
- **Core System Features**: Multi-tenant architecture, Shopify-first data synchronization, instance-based fulfillment, gamified 5-step onboarding, and real-time sync progress tracking.
- **AI Integration**:
    - **Customer Support**: OpenAI GPT-4 for automated, business-contextual responses.
    - **Sofia Virtual Agent**: Empathetic AI with Telnyx Voice API, emotional context analysis, dynamic prompt generation, adaptive response tone, and intelligent ticket creation.
    - **Creative Intelligence**: OpenAI GPT-4 for Facebook Ads creative analysis (insights, recommendations, variant generation), real-time SSE for progress, cost estimation, batch processing, comprehensive metrics, and advanced copywriting analysis.
    - **Intelligent Refund Management**: AI-powered customer retention using GPT-4 for progressive engagement, critical keyword detection, and adaptive responses.
- **Email System**: Professional HTML templates, multilingual support, Reply-To configuration, threading, smart keyword detection, and universal auto-confirmation.
- **Shipping Integration**: European Fulfillment Center API for lead creation, status tracking, product management, and country selection, with JWT-based authentication.
- **Voice System**: Telnyx Voice API (PT-BR gather-only architecture) for Sofia's outbound calling and real-time PT-BR speech recognition.
- **Affiliate Program System**: Enterprise-grade affiliate marketing with JWT-signed tracking links, centralized landing page hosting on Vercel, and anti-fraud protection. Includes product discovery, affiliation requests, and a universal tracking system.
- **Visual Editor V4 (Native)**: 100% PageModelV4-native visual editor with perfect HTML→Editor→Edit→Save fidelity and Elementor-style drag and drop. Renders recursive node trees preserving exact HTML tags, attributes, responsive styles, and semantic structure. Features include a recursive renderer, a 3-zone editor layout, hierarchical layers panel, comprehensive properties panel (including responsive styles, text content, HTML attributes), deep merge logic for preserving node data, `@dnd-kit` powered drag and drop with explicit drop zones and intelligent container detection, and a semantic validation system for enforcing valid HTML structures. Replaces V2/V3 editors for affiliate landing pages.
- **HTML-to-PageModel Converter V4**: 100% fidelity converter with recursive node architecture supporting any HTML structure. Features an enhanced CSS parser with combinator selectors, pseudo-classes, media queries, and specificity-based cascade computation; complete layout property extraction (flexbox, grid); and semantic HTML preservation.
- **PageModelV4 Architecture**: Universal recursive node system where each node preserves tag, type, attributes, classNames, inlineStyles, responsive styles (desktop/tablet/mobile), states (pseudo-classes), layout metadata, children, animations, transitions, and pseudoElements.

### System Design Choices
- **Database Schema**: UUID primary keys, automatic timestamps, decimal precision for financial data. Tables for users, orders, metrics, fulfillment leads, products, shipping providers, investment pools, investor profiles, investments, transactions, performance history, and intelligent refund requests.
- **Authentication & Authorization**: Role-based access control (Admin, user, investor, supplier, finance, affiliate) with frontend route guards and strict tenant isolation.
- **Security**: JWT tokens stored in HTTP-only cookies, bcrypt hashing for passwords.
- **Tracking System**: JWT tokens with 90-day expiration, IP-based deduplication, user agent tracking, referrer capture, landing URL logging, order attribution, commission calculation, and duplicate prevention.
- **Landing Pages**: Centralized Vercel hosting with single platform account, automatic tracking pixel injection, HTML/CSS/JS storage, draft/active/archived states, admin-controlled deployment and affiliate assignment.

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