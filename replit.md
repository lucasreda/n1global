# COD Dashboard

## Overview
The COD Dashboard is a modern full-stack web application designed for managing Cash on Delivery (COD) orders and providing business metric analysis. It features a comprehensive dashboard for order tracking, customer management, and performance monitoring with real-time data visualization, authentication, and integrations with shipping providers. The project aims to provide a robust solution for businesses to efficiently manage their COD operations and gain actionable insights.

## Recent Changes (August 26, 2025)
✓ **Operations Access Issue Resolved**: Fixed critical frontend rendering problem where operations were not displaying despite being loaded correctly
✓ **DOM Error Corrected**: Resolved nested `<a>` tag issue in Sidebar navigation that was preventing proper rendering
✓ **Authentication Robustness**: Implemented fallback system for operations loading that handles authentication issues gracefully
✓ **Production Compatibility**: Enhanced system resilience for production environment deployment
✓ **User Access Verified**: Confirmed fresh@teste.com user has correct access to 3 operations: "Dss", "test 2", "Test 3"
✓ **Shopify Sync Enhancement**: Implemented comprehensive real-time progress tracking for Shopify synchronization with granular updates during order processing (2,739 orders processed successfully)
✓ **Dual Service Monitoring**: Enhanced `/api/sync/progress` endpoint to monitor both Shopify Sync Service and Smart Sync Service simultaneously with proper priority handling
✓ **Independent Sync Endpoints**: Created dedicated `/api/sync/shopify` endpoint for Shopify-first synchronization testing and validation
✓ **Individual Progress Bars Implementation**: Fixed layout issues and implemented individual real-time progress bars for each sync step (Shopify, Shipping, Ads, Matching) with proper responsive design and progress percentages
✓ **Sequential Sync Flow**: Enhanced onboarding to trigger shipping, ads, and matching sync steps automatically when Shopify sync completes, providing smooth user experience with realistic progress simulation
✓ **Progress Layout Fix**: Resolved layout issues with progress bars breaking to the right and sticking to borders by implementing proper flexbox containment with `max-w-full` and responsive margin controls
✓ **Automatic Step Activation**: Implemented system to automatically trigger and display progress for shipping, ads, and matching steps when Shopify synchronization completes, ensuring seamless user experience
✓ **Onboarding Completion Fix**: Corrected endpoint URL in frontend (from `/api/users/onboarding-complete` to `/api/user/complete-onboarding`) and added proper authentication headers to ensure onboarding completion is properly marked in database
✓ **Data Reset System**: Implemented complete data cleanup system that properly removes all orders and resets onboarding status for fresh testing cycles
✓ **Critical JWT Token Fix**: Resolved 403 "Token inválido" error in onboarding completion by correcting localStorage token key from 'token' to 'auth_token' - this was the root cause preventing users from completing onboarding flow and accessing the dashboard
✓ **Post-Onboarding Redirect Fix**: Corrected redirect destination from '/dashboard' to '/' after onboarding completion to match application's root route structure

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

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Authentication**: JWT-based authentication with bcryptjs
- **Data Storage**: In-memory storage with planned PostgreSQL migration via Drizzle ORM
- **Session Management**: Express sessions with PostgreSQL session store (connect-pg-simple)
- **API Design**: RESTful endpoints with structured error handling and logging middleware
- **Core Features**: Multi-tenant architecture with operations-based data organization, supporting Store accounts as data owners and Product Seller accounts as view-only users accessing the same dataset. Implementation includes context-aware data access and unified business intelligence displays.
- **Key Architectural Decisions**: Shopify-first data synchronization, where Shopify orders are the primary source, matched with carrier orders by customer name. Refactored fulfillment service to an instance-based architecture ensuring user-specific credentials and data isolation. Implemented a comprehensive gamified 5-step onboarding flow with progress tracking and automatic completion logic. Real-time sync progress tracking system provides feedback during data synchronization.

### Database Design
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Structure**: Includes tables for users, orders, dashboard metrics, fulfillment leads, products, and shipping providers.
- **Key Features**: UUID primary keys, automatic timestamps, decimal precision for financial data.

### Authentication & Authorization
- **Strategy**: JWT tokens with secure HTTP-only cookies.
- **Password Security**: Bcrypt hashing.
- **Session Management**: PostgreSQL-backed sessions.
- **Role System**: Admin/user roles with different access levels.
- **Frontend Protection**: Route guards and token-based API requests.
- **Tenant Isolation**: Strict tenant isolation enforced for all services (e.g., Facebook and Google Ads) through `storeId` filtering and context middleware.

### Shipping Integration Architecture
- **Active Providers**: European Fulfillment Center API.
- **Planned Providers**: Correios and Jadlog.
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