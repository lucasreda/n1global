# COD Dashboard

## Overview

This is a modern full-stack web application for managing Cash on Delivery (COD) orders and analyzing business metrics. Built with React + TypeScript on the frontend and Express.js on the backend, the system provides a comprehensive dashboard for tracking orders, managing customers, and monitoring performance metrics. The application features real-time data visualization, authentication, and integrations with shipping providers like Correios and Jadlog.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Progress (August 2025)

✅ **SKU DISPLAY IMPLEMENTATION COMPLETE** (August 22, 2025): Successfully implemented SKU display in orders table showing Shopify product SKUs in format #KITLENCOL (uppercase) with fallback to original reference system. Column "REF.S / REF" now extracts SKU from products JSON array and displays as #[SKU] format as requested by user.

✅ **FRONTEND-BACKEND SYNCHRONIZATION RESOLVED** (August 22, 2025): Fixed critical desynchronization issue preventing order display. Implemented proper X-Operation-Id header passing, corrected authenticatedApiRequest function parameters, and resolved token validation. System now successfully displays 1,264 Shopify orders in operation "Dss" with complete data integration.

✅ **SHOPIFY-FIRST SYNC ARCHITECTURE COMPLETE** (August 22, 2025): Successfully implemented revolutionary Shopify-first data flow where Shopify orders are imported as primary source and matched with carrier orders by customer name. Schema enhanced with carrierImported, shopifyOrderId, and dataSource fields. Created ShopifySyncService for two-stage synchronization: Shopify import → carrier matching → status updates. This ensures complete order data retention even when carrier API lacks information.

✅ **PROVIDER ARCHITECTURE REFACTOR COMPLETE** (August 22, 2025): Successfully refactored fulfillment service from singleton pattern to instance-based architecture, ensuring each user's provider uses exclusively their own credentials. Fixed all import dependencies, resolved TypeScript schema issues, and implemented complete data isolation between operations. User reset functionality validated - all operations, integrations, and onboarding status properly cleared.

✅ **COMPLETE ONBOARDING AND DATA SYNCHRONIZATION SUCCESS** (August 22, 2025): Successfully implemented instance-based fulfillment service architecture ensuring user-specific credentials for data isolation. Resolved all synchronization inconsistencies, consolidated 1226+ orders into correct operation, and validated complete onboarding workflow from setup to dashboard access. System now provides seamless data import with proper user context and authentic European Fulfillment integration.

✅ **COMPLETE SYSTEM CLEAN AND ONBOARDING RESET** (August 22, 2025): Performed comprehensive system cleanup removing all 1076 orders, dashboard metrics, Facebook campaigns from third-party accounts, and reset onboarding status to fresh state. System now ready for clean onboarding experience without data contamination.

✅ **REAL-TIME SYNC PROGRESS SYSTEM** (August 22, 2025): Implemented comprehensive progress tracking system with `/api/sync/progress` endpoint providing real-time feedback during synchronization including current page, processed orders count, estimated time remaining, and detailed status messages. Enhanced user experience during data import with visual progress indicators updating every 5 orders.

✅ **THIRD-PARTY CAMPAIGN CLEANUP** (August 22, 2025): Removed all 23 Facebook campaigns and 3 ad accounts that belonged to other users, ensuring complete data isolation and preventing marketing cost calculation from unauthorized accounts. System now shows only user-specific advertising data.

✅ **ENHANCED SYNC FEEDBACK** (August 22, 2025): Improved synchronization logging with detailed progress messages, page-by-page feedback, and better error handling. Users now receive clear information about import progress including "Importando pedidos: X novos importados (Página Y)" status updates.

✅ **Multi-Tenant Architecture Implementation**: Successfully implemented complete multi-tenant system where Store accounts own all data (orders, integrations, products) and Product Seller accounts consume Store data directly as view-only users.

✅ **Store-Product Seller Data Sharing**: Product Seller users now access the exact same data as their associated Store account - no separate data isolation. Both roles see identical dashboard metrics, orders, and analytics from the Store's complete dataset.

✅ **Dashboard Data Architecture Fix**: Corrected dashboard service to bypass date filtering and show all Store data without artificial limitations. Both Store owners and Product Sellers see complete business metrics from the full dataset.

✅ **Context-Aware Data Access**: Implemented middleware system that automatically determines which Store's data to display based on user role - Store owners see their own data, Product Sellers see their associated Store's data.

✅ **Unified Business Intelligence**: Dashboard now displays real business metrics from complete dataset including all orders, revenue, status distribution, and performance analytics. No data segregation between user roles.

✅ **Complete European Fulfillment Integration**: System maintains full synchronization with European Fulfillment API for 937+ leads/orders with automatic incremental updates and smart sync capabilities.

✅ **Facebook Ads Integration**: Complete integration with Facebook Ads API including account management, campaign synchronization, and dynamic marketing cost calculation replacing the fixed 20% model.

✅ **Dynamic Marketing Costs**: Dashboard now calculates marketing costs from selected Facebook Ad campaigns instead of using fixed percentage, enabling precise ROI and profit margin calculations based on actual advertising spend.

✅ **Period-Based Marketing Costs**: Marketing costs in dashboard now reflect actual spend from selected Facebook campaigns for the chosen time period (1d, 7d, 30d, 90d) instead of fixed percentages.

✅ **Multi-Currency Marketing Display**: Marketing costs show primary values in BRL with secondary EUR values, using real-time conversion rates for accurate financial tracking and consolidated reporting.

✅ **Multi-Operation Architecture**: Implemented complete operations-based data organization where all data (orders, integrations, products) are organized under specific operations. Created "PureDreams" as default operation with 1173+ migrated orders. Added operation selector in sidebar with "Add New" functionality for future expansion.

✅ **Gamified Onboarding System**: Complete 5-step onboarding flow implemented with database schema updates (onboardingCompleted, onboardingSteps), middleware protection blocking dashboard access until completion, gamified UI with progress tracking, and fullscreen layout without sidebar. Steps include: operation creation, Shopify integration, shipping provider setup, ads integration, and data synchronization with retry logic.

✅ **ADS SERVICES TENANT ISOLATION COMPLETE**: Both Facebook and Google Ads services now enforce strict tenant isolation with storeId filtering throughout the sync pipeline, preventing data leakage across operations and ensuring complete multi-tenant security.

✅ **FACEBOOK ADS ROUTES SECURED**: Updated all Facebook Ads API routes to use storeContext middleware and pass storeId for complete data isolation between different store operations.

✅ **UNIFIED ADS SYNC ARCHITECTURE**: All advertising sync methods (Facebook/Google) now accept and enforce storeId parameters for consistent multi-tenant isolation across the entire advertising data pipeline.

✅ **COMPLETE ONBOARDING SYSTEM SUCCESS**: Full 5-step onboarding implementation achieved total success with all 1076 orders from Spain automatically imported and onboarding marked as complete. System features automatic completion detection when ≥100 orders are synchronized, proper user context handling, and comprehensive error handling with detailed response metrics.

✅ **AUTO-COMPLETION LOGIC VALIDATED**: Modified SmartSyncService to automatically complete onboarding when substantial data import occurs (100+ orders), preventing manual intervention requirements and ensuring seamless user experience from setup to dashboard access.

✅ **SYNC ARCHITECTURE OPTIMIZED**: Disabled problematic automatic background sync that lacked user context, maintaining only manual sync capabilities via dashboard to prevent store_id null errors and ensure proper multi-tenant data isolation.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite build system
- **UI Framework**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom glassmorphism design system and dark theme
- **State Management**: Zustand for authentication state
- **Data Fetching**: React Query (TanStack Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Charts**: Recharts for data visualization (revenue trends, order distribution)
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: JWT-based authentication with bcryptjs password hashing
- **Data Storage**: In-memory storage with planned PostgreSQL migration via Drizzle ORM
- **Session Management**: Express sessions with PostgreSQL session store (connect-pg-simple)
- **API Design**: RESTful endpoints with structured error handling and logging middleware

### Database Design
- **ORM**: Drizzle ORM with PostgreSQL dialect  
- **Schema Structure**:
  - `users`: User accounts with role-based permissions (admin/user)
  - `orders`: COD orders with customer info, amounts, status tracking, and shipping details
  - `dashboard_metrics`: Aggregated daily metrics for performance tracking
  - `fulfillment_leads`: European Fulfillment Center leads with customer and shipping data
  - `products`: Product catalog with SKU, pricing, and inventory management
  - `shipping_providers`: Configuration for fulfillment providers
- **Key Features**: UUID primary keys, automatic timestamps, decimal precision for financial data

### Authentication & Authorization
- **Strategy**: JWT tokens with secure HTTP-only cookies
- **Password Security**: Bcrypt hashing with salt rounds
- **Session Management**: PostgreSQL-backed sessions for scalability
- **Role System**: Admin/user roles with different access levels
- **Frontend Protection**: Route guards and token-based API requests

### Data Visualization
- **Charts**: Revenue trends (area charts) and order distribution (pie charts)
- **Metrics**: Real-time KPIs including total orders, success rates, and revenue
- **Filtering**: Time-based filtering (7 days, 30 days, 3 months)
- **Responsive Design**: Mobile-first approach with adaptive layouts

### Shipping Integration Architecture
- **Active Providers**: European Fulfillment Center with complete API integration
- **Planned Providers**: Correios and Jadlog shipping integrations
- **Features**: Lead creation, status tracking, product management, country selection
- **Authentication**: JWT-based API authentication with token caching
- **Error Handling**: SSL certificate handling for development environment
- **UI Components**: Full dashboard with tabs for testing, leads, creation, and products

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm & drizzle-kit**: Type-safe ORM with migration management
- **@tanstack/react-query**: Server state management and caching
- **react-hook-form & @hookform/resolvers**: Form handling with validation
- **zod & drizzle-zod**: Schema validation and type safety
- **node-fetch**: HTTP client for European Fulfillment Center API integration

### UI and Styling
- **@radix-ui/react-\***: Accessible component primitives (30+ components)
- **tailwindcss**: Utility-first CSS framework with custom configuration
- **class-variance-authority & clsx**: Dynamic className generation
- **recharts**: Declarative chart library for data visualization
- **lucide-react**: Modern icon library

### Authentication & Security
- **jsonwebtoken**: JWT token generation and verification
- **bcryptjs**: Password hashing and comparison
- **connect-pg-simple**: PostgreSQL session store for Express

### Development & Build Tools
- **vite**: Fast build tool with HMR and TypeScript support
- **@vitejs/plugin-react**: React integration for Vite
- **tsx**: TypeScript execution for development
- **esbuild**: Fast JavaScript bundler for production builds

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay
- **@replit/vite-plugin-cartographer**: Development tooling integration