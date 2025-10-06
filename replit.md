# COD Dashboard

## Overview
The COD Dashboard is a full-stack web application for managing Cash on Delivery (COD) orders and business analytics. It offers order tracking, customer management, real-time performance monitoring, secure multi-role authentication, and AI-powered features. Key capabilities include an empathetic virtual agent, comprehensive investment management, creative intelligence for Facebook Ads, an enterprise-grade visual editor (PageModelV3) with HTML conversion and style preservation, a production-ready component library, a template system, and AI-powered page generation. The system supports various user roles (investors, suppliers, finance, administrators) to optimize COD operations and provide actionable business insights.

## User Preferences
Preferred communication style: Simple, everyday language.
Quality priority: Maximum quality and highest level possible ("atingir o mais alto nivel possivel").

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
    - **Sofia Virtual Agent**: Empathetic AI with Telnyx Voice API, emotional context analysis, dynamic prompt generation, adaptive response tone, and intelligent ticket creation.
    - **Creative Intelligence**: OpenAI GPT-4 for Facebook Ads creative analysis (insights, recommendations, variant generation), real-time SSE for progress, cost estimation, batch processing, comprehensive metrics, and advanced copywriting analysis.
    - **Intelligent Refund Management**: AI-powered customer retention using GPT-4 for progressive engagement, critical keyword detection, and adaptive responses.
- **Email System**: Professional HTML templates, multilingual support, Reply-To configuration, threading, smart keyword detection for automated responses, and universal auto-confirmation.
- **Shipping Integration**: European Fulfillment Center API for lead creation, status tracking, product management, and country selection, with JWT-based authentication.
- **Voice System**: Telnyx Voice API (PT-BR gather-only architecture) for Sofia's outbound calling and real-time PT-BR speech recognition.
- **Affiliate Program System**: Enterprise-grade affiliate marketing with JWT-signed tracking links, centralized landing page hosting on Vercel, and anti-fraud protection. Includes dedicated database tables and features like product discovery, affiliation requests, and a universal tracking system.
- **Visual Editor (PageModelV3)**: Enterprise-grade visual editor with professional 4-zone layout (top bar, left elements toolbar, center preview, right properties panel) following industry standards like VitaPlus. Consolidated top bar contains breakpoint selector (desktop/tablet/mobile), AI generation, templates, design tokens, layers, components, and history. Supports editing of AI-generated pages, ensures compatibility with `PageModelV2` and `PageModelV3`, preserves unknown fields as hidden metadata, and handles AI page generation with real-time SSE progress tracking. Includes FlexLayoutControls, GridLayoutControls, PositionControls, LayersPanel (dialog-based), Pseudo-Classes Editor (Default, Hover, Focus, Active, Disabled), Animations & Transitions Editor, Design Tokens Manager, a production-ready Component Library, and a Template System with predefined layouts. Features AI Page Generation with prompt-based creation and real-time SSE progress. Includes an Advanced Inspector with Box Model Inspector, Professional Color Picker, Font Selector, and Spacing Presets. Properties panel features professional empty state with clear messaging when no element is selected.
- **HTML-to-PageModel Converter V4**: 100% fidelity converter with recursive node architecture supporting any HTML structure. Features: (1) Enhanced CSS parser with combinator selectors (>, +, ~, descendant), pseudo-classes (:hover, :focus, :nth-child), media queries for responsive breakpoints, and specificity-based cascade computation. (2) Complete layout property extraction including all flexbox properties (flexWrap, justifyContent, alignItems, flexDirection, gap) and grid properties (gridTemplateColumns, gridTemplateRows, gridTemplateAreas, gridColumn, gridRow, gridAutoFlow). (3) Semantic HTML preservation - renders exact tags (header, footer, nav, main, section, aside, article) instead of converting to generic divs. (4) CSS variables preservation in globalStyles. (5) Validated with complex HTML: 43 nodes, 17 unique tags, grid template areas, flexbox with wrap, combinator selectors working correctly.
- **PageModelV4 Architecture**: Universal recursive node system with arbitrary nesting depth. Each node preserves: tag (exact HTML element), type (semantic NodeType), attributes (href, src, data-*), classNames, inlineStyles, styles (ResponsiveStylesV4 with desktop/tablet/mobile), states (hover/focus/active pseudo-classes), layout metadata, children (recursive PageNodeV4[]), animations, transitions, and pseudoElements. Supports complete V2↔V3↔V4 conversion pipeline with auto-detection and backwards compatibility.

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