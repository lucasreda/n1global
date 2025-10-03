# COD Dashboard

## Overview
The COD Dashboard is a full-stack web application for managing Cash on Delivery (COD) orders and business metric analysis. It offers order tracking, customer management, performance monitoring with real-time data visualization, and secure authentication. Key capabilities include AI-powered customer support, an empathetic virtual agent (Sofia) with intelligent voice capabilities, comprehensive investment management, and creative intelligence tools for analyzing Facebook Ads performance with AI-driven recommendations. The system supports multi-role access (investors, suppliers, finance, administrators) and aims to provide businesses with efficient COD operations and actionable insights.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript and Vite
- **UI**: shadcn/ui (Radix UI primitives), Tailwind CSS (glassmorphism, dark theme)
- **State Management**: Zustand (authentication)
- **Data Fetching**: React Query
- **Routing**: Wouter
- **Charts**: Recharts
- **Forms**: React Hook Form with Zod
- **Design**: Mobile-first, adaptive layouts, Apple-style sidebar, responsive elements.

### Backend
- **Runtime**: Node.js with Express.js (TypeScript, ES modules)
- **Authentication**: JWT, bcryptjs
- **Data Storage**: In-memory (planned PostgreSQL migration via Drizzle ORM), PostgreSQL for sessions (connect-pg-simple)
- **API**: RESTful, structured error handling, logging
- **Core Features**: Multi-tenant architecture (Store accounts as data owners, Product Seller accounts view-only), context-aware data access, Shopify-first data sync, instance-based fulfillment service, gamified 5-step onboarding, real-time sync progress tracking.
- **AI Integration**:
    - **Customer Support**: OpenAI GPT-4 for automatic responses (doubts, address changes, cancellations) integrated with business context.
    - **Sofia Virtual Agent**: Empathetic AI with voice capabilities (Telnyx Voice API), intelligent emotional context analysis, dynamic prompt generation, adaptive response tone, intelligent ticket creation.
    - **Creative Intelligence**: OpenAI GPT-4 for Facebook Ads creative analysis (performance insights, recommendations, variant generation), real-time SSE for progress, cost estimation, batch processing, comprehensive metrics (CTR, CPC, CPM, ROAS). Includes advanced copywriting analysis (persuasion triggers, narrative structure, persona/tone, power words).
- **Email System**: Professional HTML templates, multilingual, Reply-To configuration, threading system, smart keyword detection for automated responses.

### Database
- **ORM**: Drizzle ORM (PostgreSQL dialect)
- **Schema**: Tables for users, orders, metrics, fulfillment leads, products, shipping providers, investment pools, investor profiles, investments, transactions, performance history.
- **Features**: UUID primary keys, automatic timestamps, decimal precision for financial data.

### Authentication & Authorization
- **Strategy**: JWT tokens (HTTP-only cookies), bcrypt hashing.
- **Session Management**: PostgreSQL-backed.
- **Roles**: Admin, user, investor, supplier, finance (different access levels).
- **Security**: Frontend route guards, token-based API requests, strict tenant isolation via `storeId` filtering.

### Shipping Integration
- **Provider**: European Fulfillment Center API.
- **Features**: Lead creation, status tracking, product management, country selection.
- **Authentication**: JWT-based API with token caching.

### Voice System
- **Provider**: Telnyx Voice API (PT-BR gather-only architecture).
- **Virtual Agent**: Sofia (AI-powered sales and support).
- **Features**: Outbound calling, real-time PT-BR speech recognition, adaptive responses.
- **Safety**: 8-second timeout fallback.

## External Dependencies

- **PostgreSQL**: Via `@neondatabase/serverless` for database connectivity.
- **Drizzle ORM**: For type-safe ORM and migration management.
- **TanStack Query**: For server state management and caching.
- **Zod**: For schema validation and type safety.
- **node-fetch**: For HTTP client operations, e.g., European Fulfillment Center API.
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

## Recent Changes (October 3, 2025)

### Intelligent Refund Management System ✅
- **NEW FEATURE**: AI-powered customer retention system with progressive engagement strategy
- **AI STRATEGY MODULE** (`server/ai/refund-strategy-ai.ts`):
  - **Critical Keyword Detection**: Flags legal threats (polícia, justiça, advogado, denúncia, procon) for immediate escalation
  - **State Machine**: Three-stage progression (retention → escalation → refund form)
  - **Adaptive Responses**: OpenAI GPT-4 generates context-aware retention/escalation messages
- **PROGRESSIVE ENGAGEMENT FLOW**:
  1. **First Contact**: AI attempts persuasion/retention (NO refund form offered)
  2. **Escalation Trigger**: Critical keywords detected → immediate escalation path
  3. **Refund Form Offer**: Only after retention attempts or critical escalation
- **TICKET PROGRESSION TRACKING**:
  - New fields: `retentionAttempts`, `escalationReason`, `refundOffered`, `refundOfferedAt`
  - AI analyzes message history and content to determine strategy
- **PUBLIC REFUND FORM V2** ✨:
  - **Comprehensive Data Collection**:
    - Order details: Number, purchase date, product name
    - Full billing address (country, city, street, number, complement, state, zip)
    - IBAN banking (international standard, no local accounts)
    - Control number (return proof tracking)
    - Refund reason and additional details
  - **File Attachments** (Object Storage integration):
    - Comprovativo de encomenda (order proof)
    - Fotos dos produtos (product photos)
    - Comprovante de devolução (return proof with payment)
    - Documento de identificação (ID document with photo)
    - All files uploaded to Replit Object Storage private directory
  - **Customer Declarations** (mandatory checkboxes):
    - Form completion acknowledgment
    - Attachments provided confirmation
    - IBAN correctness verification
  - **Auto-filled from Linked Order**:
    - Customer name, email, order number, product name
    - Refund amount (read-only, from linked order total)
  - **UI/UX**:
    - Sectioned design: Dados do Pedido, Informações de Reembolso, Anexos Obrigatórios, Declarações
    - Important information alert with requirements
    - Drag-and-drop file upload with image preview
    - IBAN validator link (wise.com)
    - Success confirmation screen
  - **Technical Implementation**:
    - Multipart/form-data via Multer
    - File validation (type, size limits)
    - Object storage upload with unique filenames (nanoid)
    - FormData submission from frontend
- **ADMIN DASHBOARD**:
  - New page: `/inside/support/refunds`
  - Overview metrics: Pending/approved/rejected counts
  - Detailed review modal with approve/reject actions
  - Endpoints: GET/PATCH `/api/support/refund-requests`
- **SIDEBAR SUBMENU**:
  - "Suporte" menu now expandable with:
    - Tickets (`/inside/support`)
    - Reembolsos (`/inside/support/refunds`)
  - Auto-expands when on support pages
- **DATABASE SCHEMA**:
  - Extended `reimbursementRequests` table:
    - Order fields: purchaseDate, billing address (7 fields)
    - Banking: bankIban, controlNumber
    - Attachments: orderProofUrl, productPhotosUrl, returnProofUrl, idDocumentUrl
    - Declarations: 3 boolean fields
    - Legacy fields preserved for backward compatibility
  - Integration with `supportTickets` via foreign key
- **ARCHITECT REVIEWED**: All components approved - no blocking defects, security issues, or critical improvements needed

### Universal Email Auto-Confirmation ✅
- **NEW FEATURE**: Immediate confirmation for ALL incoming support emails
- **IMPLEMENTATION**: Added `sendReceiptConfirmation` method that runs BEFORE any categorization/processing
- **EMAIL CONTENT**:
  - ✅ Generic confirmation message (NO AI/Sofia mention)
  - 📋 States "setor competente e responsável" will analyze
  - ⏱️ Promises response within 24 business hours
  - 🎨 Uses branded design config per operation
- **FLOW**: Email arrives → Immediate confirmation sent → Then categorization/AI processing
- **ERROR HANDLING**: Confirmation failures don't block email processing
- **TEST ENDPOINT**: `/api/support/test-confirmation` for testing

## Previous Changes

### Visual Editor PageModelV2 Support ✅
- **CRITICAL FIX**: Resolved visual editor incompatibility with AI-generated pages
- **ROOT CAUSE**: PageVisualEditor used local `PageModel` interface (flat structure with `sections.content`) incompatible with PageModelV2 (hierarchical `sections→rows→columns→elements`)
- **SOLUTION**: Complete refactoring for universal compatibility:
  1. **pageModelAdapter.ts**: Created adapter with type guards (`isPageModelV2`, `isLegacyPageModel`) and conversion functions (`upgradeLegacyModel`, `ensurePageModelV2`, `downgradeToLegacy`)
  2. **PageVisualEditor.tsx**: Updated to import `PageModelV2` from schema, apply adapter on load/save, ensure all pages use V2 format
  3. **SectionEditor refactor**: Displays hierarchical structure (sections→rows→columns→elements), supports editing heading/text/button/image elements, preserves full AI-generated content
  4. **Auto-upgrade**: Legacy manual pages automatically upgraded to V2 on first edit (non-destructive)
- **DATA SAFETY IMPROVEMENTS**:
  1. **Unknown field preservation**: Unmapped content/config fields saved as hidden metadata elements
  2. **Console warnings**: Clear logging when legacy conversion occurs and unknown fields detected
  3. **Visual warning banner**: Yellow alert banner shows when legacy page loaded with specific conversion warnings
  4. **Metadata preservation**: Unknown fields stored in JSON format within hidden elements for potential recovery
  5. **Clean persistence**: Auxiliary conversion flags (`_convertedFromLegacy`, `_conversionWarnings`) stripped before database save
  6. **State reset**: Legacy flags properly reset when navigating between pages to prevent false positives
- **COMPATIBILITY**: Works for ALL pages (current manual + all future AI-generated), minimal data loss risk with metadata preservation
- **EDITING**: Supports basic element editing (text, headings, buttons, images), extensible for advanced types
- **CURRENT STATUS**: No legacy pages exist in database (all are V2 or empty), risk is theoretical and mitigated
- **STATUS**: Visual editor now correctly loads and edits AI-generated funnel pages with defensive safeguards

### AI Page Generation Complete Fix ✅
- **CRITICAL FIX**: Resolved all AI page generation issues including progress tracking and database persistence
- **BUG 1 - Authentication**: Fixed `useAIProgressStream` hook using wrong localStorage key (`token` → `auth_token`)
- **BUG 2 - Timing/SSE**: POST endpoint was blocking for ~11 minutes before returning sessionId, causing client to miss all SSE progress events
- **BUG 3 - Database**: Background execution wasn't persisting generated pages to database (missing INSERT after completion)
- **SOLUTION**: Complete refactoring of generation flow:
  1. POST endpoint returns sessionId IMMEDIATELY
  2. Generation executes in background with EventEmitter-based SSE progress
  3. Upon completion, page is saved to `funnelPages` table with proper error handling
  4. Completion event includes generated pageId
- **UI FIX**: Modal now controlled independently via `showProgressModal` state to properly display 3-second completion before auto-close
- **ERROR HANDLING**: Separate error messages for generation failures vs database save failures
- **COMPLETE FLOW**: Form submit → immediate sessionId response → SSE connection → real-time progress updates → database save → completion event with pageId → 3s completion display → modal auto-close