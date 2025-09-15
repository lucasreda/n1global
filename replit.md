# COD Dashboard

## Overview
The COD Dashboard is a modern full-stack web application designed for managing Cash on Delivery (COD) orders and providing business metric analysis. It features a comprehensive dashboard for order tracking, customer management, and performance monitoring with real-time data visualization, authentication, and integrations with shipping providers. The project aims to provide a robust solution for businesses to efficiently manage their COD operations and gain actionable insights. This includes AI-powered automatic responses for customer support, an empathetic virtual agent named Sofia with intelligent voice capabilities, comprehensive investment management functionalities for tracking portfolios and returns, and creative intelligence tools for analyzing Facebook Ads performance with AI-powered recommendations. The system is built to provide a robust solution for businesses to efficiently manage their COD operations and gain actionable insights, supporting multi-role access including investors, suppliers, finance, and administrators.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite
- **UI Framework**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom glassmorphism design system and dark theme
- **State Management**: Zustand for authentication state
- **Data Fetching**: React Query (TanStack Query)
- **Routing**: Wouter for lightweight client-side routing
- **Charts**: Recharts for data visualization
- **Form Handling**: React Hook Form with Zod validation
- **Design Principles**: Mobile-first approach with adaptive layouts for data visualization, including revenue trends and order distribution charts, and real-time KPIs.
- **UI/UX Decisions**: Apple-style sidebar navigation for investment dashboard, responsive design for progress bars, and consistent thumbnail displays in product cards and search results.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Authentication**: JWT-based authentication with bcryptjs
- **Data Storage**: In-memory storage with planned PostgreSQL migration via Drizzle ORM
- **Session Management**: Express sessions with PostgreSQL session store (connect-pg-simple)
- **API Design**: RESTful endpoints with structured error handling and logging middleware
- **Core Features**: Multi-tenant architecture with operations-based data organization, supporting Store accounts as data owners and Product Seller accounts as view-only users accessing the same dataset. Implementation includes context-aware data access and unified business intelligence displays.
- **Key Architectural Decisions**: Shopify-first data synchronization, where Shopify orders are the primary source, matched with carrier orders by customer name. Refactored fulfillment service to an instance-based architecture ensuring user-specific credentials and data isolation. Implemented a comprehensive gamified 5-step onboarding flow with progress tracking and automatic completion logic. Real-time sync progress tracking system provides feedback during data synchronization.
- **AI Integration**: AI-powered automatic responses using OpenAI GPT-4 for specific customer queries (e.g., doubts, address changes, cancellations), integrated with business context (delivery times, payment policies). The AI agent, Sofia, is empathetic, adapts to the customer's language, and applies only to eligible categories. Enhanced voice capabilities include intelligent emotional context analysis, dynamic prompt generation using AI directives per operation, adaptive response tone based on customer sentiment, and intelligent ticket creation with priority levels. Voice system fully integrates with email support infrastructure ensuring consistent customer experience across all channels.
- **Creative Intelligence**: AI-powered analysis of Facebook Ads creatives using OpenAI GPT-4, providing performance insights, recommendations, and variant generation. Features real-time SSE (Server-Sent Events) for job progress tracking, cost estimation per analysis, batch processing with per-creative status tracking, and comprehensive creative performance metrics (CTR, CPC, CPM, ROAS). Enhanced with advanced copywriting analysis capabilities including persuasion trigger detection, narrative structure analysis, performance metrics, persona/tone assessment, power words categorization, and scene-specific contextual suggestions. The CopyAnalysisService provides actionable insights to help operations teams create more persuasive advertisements.
- **Email System**: Professional HTML email templates with corporate branding, multilingual support, Reply-To configuration, and a threading system that identifies customer replies to update ticket status and maintain conversation continuity. Smart keyword detection for automated responses.

### Database Design
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Structure**: Includes tables for users, orders, dashboard metrics, fulfillment leads, products, shipping providers, investment pools, investor profiles, investments, transactions, and performance history.
- **Key Features**: UUID primary keys, automatic timestamps, decimal precision for financial data.

### Authentication & Authorization
- **Strategy**: JWT tokens with secure HTTP-only cookies.
- **Password Security**: Bcrypt hashing.
- **Session Management**: PostgreSQL-backed sessions.
- **Role System**: Admin, user, investor, supplier, and finance roles with different access levels.
- **Frontend Protection**: Route guards and token-based API requests.
- **Tenant Isolation**: Strict tenant isolation enforced for all services (e.g., Facebook and Google Ads) through `storeId` filtering and context middleware.

### Shipping Integration Architecture
- **Active Providers**: European Fulfillment Center API.
- **Features**: Lead creation, status tracking, product management, country selection.
- **Authentication**: JWT-based API authentication with token caching.

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm & drizzle-kit**: Type-safe ORM with migration management
- **@tanstack/react-query**: Server state management and caching
- **react-hook-form & @hookform/resolvers**: Form handling with validation
- **zod & drizzle-zod**: Schema validation and type safety
- **node-fetch**: HTTP client for European Fulfillment Center API integration

### UI and Styling
- **@radix-ui/react-\***: Accessible component primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority & clsx**: Dynamic className generation
- **recharts**: Declarative chart library for data visualization
- **lucide-react**: Modern icon library

### Authentication & Security
- **jsonwebtoken**: JWT token generation and verification
- **bcryptjs**: Password hashing and comparison
- **connect-pg-simple**: PostgreSQL session store for Express

### Integrations
- **European Fulfillment API**: Complete synchronization and smart sync capabilities.
- **Facebook Ads API**: Account management, campaign synchronization, and dynamic marketing cost calculation based on actual advertising spend.
- **OpenAI GPT-4**: For AI-powered automatic responses and the Sofia virtual agent.