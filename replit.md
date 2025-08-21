# COD Dashboard

## Overview

This is a modern full-stack web application for managing Cash on Delivery (COD) orders and analyzing business metrics. Built with React + TypeScript on the frontend and Express.js on the backend, the system provides a comprehensive dashboard for tracking orders, managing customers, and monitoring performance metrics. The application features real-time data visualization, authentication, and integrations with shipping providers like Correios and Jadlog.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Progress (August 2025)

✅ **Smart Sync System Implemented**: Created intelligent incremental synchronization that only updates active orders and new leads, minimizing API calls while keeping data current.

✅ **Real-time Dashboard**: Dashboard now displays live data from European Fulfillment Center with accurate metrics, revenue tracking, and order status distribution.

✅ **Automatic Background Sync**: System runs automatic sync every 5 minutes for active orders only, ignoring delivered orders to optimize performance.

✅ **Performance Optimization**: Smart filtering excludes finalized orders from updates, reducing API calls while maintaining real-time accuracy for active business operations.

✅ **Complete Data Import**: Successfully imported all 937 leads from European Fulfillment API with total revenue of €67,399.50 and comprehensive status tracking across all order types.

✅ **Intelligent Sync System**: Implemented adaptive synchronization that analyzes activity patterns and automatically adjusts sync scope based on volume - syncing 3-20 pages depending on detected activity levels to optimize API usage while maintaining data accuracy.

✅ **Interface Simplification**: Removed complete synchronization button from dashboard, keeping only intelligent sync and quick sync options to prevent unnecessary full API scans and optimize performance.

✅ **Intelligent Dashboard Hierarchy**: Redesigned dashboard with smart data prioritization featuring 4 distinct card sizes (hero, large, medium, small) and intelligent visual hierarchy that emphasizes profit, revenue, and delivery rate as primary metrics while organizing secondary metrics by importance.

✅ **Product Cost Configuration System**: Created comprehensive product management with detailed cost breakdown (product cost, shipping, handling, marketing, operational) and automatic profit margin calculations for enhanced financial analytics.

✅ **SKU-Based Product Mapping**: Implemented correct product-order relationship using SKUs that match actual order values (NT-MAIN-70 for €70 orders, NT-BUNDLE-130 for €130 orders, etc.) with all 937 orders now properly linked to corresponding products.

✅ **Database-First Orders Page**: Fixed orders page to fetch data directly from PostgreSQL database instead of external API, enabling accurate period filtering, status filtering, search functionality, and proper pagination for all 937 stored orders.

✅ **Facebook Ads Integration**: Complete integration with Facebook Ads API including account management, campaign synchronization, and dynamic marketing cost calculation replacing the fixed 20% model.

✅ **Dynamic Marketing Costs**: Dashboard now calculates marketing costs from selected Facebook Ad campaigns instead of using fixed percentage, enabling precise ROI and profit margin calculations based on actual advertising spend.

✅ **Ads Management Page**: New dedicated page for Facebook Ads management with campaign selection interface, real-time metrics display, and intelligent cost tracking for dashboard integration.

✅ **Period-Based Marketing Costs**: Marketing costs in dashboard now reflect actual spend from selected Facebook campaigns for the chosen time period (1d, 7d, 30d, 90d) instead of fixed percentages.

✅ **Multi-Currency Marketing Display**: Marketing costs show primary values in BRL with secondary EUR values, using real-time conversion rates for accurate financial tracking and consolidated reporting.

✅ **Campaign Selection Persistence**: Selected Facebook campaigns remain selected after synchronization operations, preserving user preferences across automatic and manual sync processes.

✅ **Automatic Shipping Sync System**: Implemented intelligent 30-minute interval automatic synchronization for shipping data similar to Facebook Ads system. Dashboard automatically checks for sync necessity on page load and executes smart sync if last update was over 30 minutes ago.

✅ **Smart Sync Integration**: Auto-sync system uses SmartSyncService with intelligent volume-based synchronization, optimizing API calls while maintaining data accuracy. Manual sync button remains available for immediate updates.

✅ **Corrected Ticket Médio Calculation**: Fixed average order value calculation to use revenue divided by delivered orders only (paid orders) instead of total orders, providing accurate per-order revenue metrics.

✅ **Enhanced Status Distribution Chart**: Redesigned dashboard status distribution with professional donut chart, real-time data from all order statuses (delivered, confirmed, shipped, pending, returned, cancelled), individual cards with descriptions and progress bars, and intelligent filtering to show only active statuses.

✅ **Revenue Clarity Enhancement**: Updated revenue display to clearly show "Receita Paga" (Paid Revenue) with subtitle indicating it's only from delivered orders, ensuring users understand the metric represents only completed/paid transactions.

✅ **Enhanced Paid Revenue Analytics (August 2025)**: Created comprehensive "Análise da Receita Paga" section with detailed breakdown showing BRL/EUR totals, delivery success rate, average ticket value, conversion rates, and performance metrics. All monetary values now display exactly 2 decimal places using formatCurrencyBRL() and formatCurrencyEUR() utility functions for consistency across the entire dashboard.

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