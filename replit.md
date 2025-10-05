# COD Dashboard

## Overview
The COD Dashboard is a full-stack web application designed for managing Cash on Delivery (COD) orders and business analytics. It provides order tracking, customer management, performance monitoring with real-time data visualization, and secure multi-role authentication. Key features include AI-powered customer support, an empathetic virtual agent (Sofia) with intelligent voice capabilities, comprehensive investment management, and creative intelligence tools for analyzing Facebook Ads performance with AI-driven recommendations. The system supports various user roles (investors, suppliers, finance, administrators) to streamline COD operations and deliver actionable business insights.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX
- **Frontend Framework**: React 18 with TypeScript and Vite
- **Styling**: shadcn/ui (Radix UI primitives), Tailwind CSS (glassmorphism, dark theme), mobile-first adaptive layouts.
- **State Management**: Zustand (authentication)
- **Data Fetching**: React Query
- **Routing**: Wouter
- **Charts**: Recharts
- **Forms**: React Hook Form with Zod

### Technical Implementations
- **Backend Runtime**: Node.js with Express.js (TypeScript, ES modules)
- **Authentication**: JWT, bcryptjs, PostgreSQL-backed sessions.
- **Database ORM**: Drizzle ORM (PostgreSQL dialect).
- **API**: RESTful with structured error handling and logging.
- **Core System Features**: Multi-tenant architecture, Shopify-first data synchronization, instance-based fulfillment, gamified 5-step onboarding, and real-time sync progress tracking.
- **AI Integration**:
    - **Customer Support**: OpenAI GPT-4 for automated, business-contextual responses.
    - **Sofia Virtual Agent**: Empathetic AI with Telnyx Voice API integration, emotional context analysis, dynamic prompt generation, adaptive response tone, and intelligent ticket creation.
    - **Creative Intelligence**: OpenAI GPT-4 for Facebook Ads creative analysis (insights, recommendations, variant generation), real-time SSE for progress, cost estimation, batch processing, comprehensive metrics, and advanced copywriting analysis.
    - **Intelligent Refund Management**: AI-powered customer retention system using GPT-4 for progressive engagement, critical keyword detection, and adaptive responses.
- **Email System**: Professional HTML templates, multilingual support, Reply-To configuration, threading, smart keyword detection for automated responses, and universal auto-confirmation.
- **Shipping Integration**: European Fulfillment Center API for lead creation, status tracking, product management, and country selection, with JWT-based authentication.
- **Voice System**: Telnyx Voice API (PT-BR gather-only architecture) for Sofia's outbound calling and real-time PT-BR speech recognition.
- **Affiliate Program System**: Enterprise-grade affiliate marketing with JWT-signed tracking links, centralized landing page hosting on Vercel, and anti-fraud protection. Includes dedicated database tables for profiles, memberships, conversions, commission rules, payouts, clicks, deployment configuration, and landing pages. Features include product discovery, affiliation requests, and a universal tracking system via URL parameters.
- **Visual Editor**: Supports editing of AI-generated pages, ensures compatibility with `PageModelV2`, preserves unknown fields as hidden metadata, and handles AI page generation with real-time SSE progress tracking.
- **HTML-to-PageModel Converter**: Advanced converter that preserves CSS styling from original HTML during landing page imports. Parses `<style>` tags, extracts CSS rules, matches classes/IDs to elements, and computes final styles using proper CSS cascade (tag → class → ID → inline). Extracts theme colors and typography from CSS variables. Handles self-closing tags correctly (img, br).

### System Design Choices
- **Database Schema**: UUID primary keys, automatic timestamps, and decimal precision for financial data. Tables for users, orders, metrics, fulfillment leads, products, shipping providers, investment pools, investor profiles, investments, transactions, performance history, and intelligent refund requests.
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