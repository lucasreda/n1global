# COD Dashboard

## Overview
The COD Dashboard is a modern full-stack web application designed for managing Cash on Delivery (COD) orders and providing business metric analysis. It features a comprehensive dashboard for order tracking, customer management, and performance monitoring with real-time data visualization, authentication, and integrations with shipping providers. The project aims to provide a robust solution for businesses to efficiently manage their COD operations and gain actionable insights.

## Recent Changes (September 5, 2025)
✓ **AI-Powered Automatic Responses**: Sistema completo de respostas automáticas inteligentes usando OpenAI GPT-4 para categorias específicas (Dúvidas, Alteração de Endereço, Cancelamento)
✓ **Sofia - Virtual Agent**: Agente de IA empática que responde de forma natural e humana, adaptando-se ao idioma do cliente automaticamente
✓ **Business Context Integration**: IA treinada com informações específicas da empresa (prazos de entrega 2-7 dias, pagamento na entrega, políticas de embalagem)
✓ **Selective AI Response**: Sistema inteligente que aplica IA apenas às categorias elegíveis, mantendo atendimento humano para reclamações e casos manuais
✓ **Professional Email Template**: Template HTML profissional com logo da empresa, design responsivo e identidade visual corporativa
✓ **Multilingual Support**: Sistema detecta e responde automaticamente no idioma do cliente (português, inglês, espanhol, etc.)
✓ **Email Threading System**: Sistema completo de threading que identifica respostas de clientes baseado em prefixos "Re:", "RE:", "Resposta:" no subject
✓ **Conversation Continuity**: Emails de resposta anexados ao ticket existente mantendo contexto completo da conversa
✓ **Smart Ticket Matching**: Lógica inteligente para encontrar tickets existentes baseada no email do cliente e similaridade do assunto
✓ **Status Auto-Update**: Status do ticket atualizado automaticamente quando cliente responde (de "waiting_customer" para "open")
✓ **Conversation History Display**: Modal de tickets mostra histórico completo de conversação com diferentes tipos (email_in, email_out, status_change)
✓ **Reply Auto-Reload**: Interface recarrega automaticamente após envio de resposta para mostrar nova entrada na conversa

## Previous Changes (September 3, 2025)
✓ **eLogy Authentication Fix**: Corrected login failure detection to properly identify "USER_NOT_FOUND" errors from eLogy API
✓ **Token Handling Enhancement**: Enhanced eLogy service to dynamically use tokens returned from login response or fallback to configured auth header
✓ **Provider Cleanup**: Removed Correios Brasil and Jadlog references from system - no longer appear as planned providers
✓ **Type Safety Improvement**: Updated ProviderType to only include 'european_fulfillment' and 'elogy'
✓ **Schema Cleanup**: Removed Correios/Jadlog references from database schema comments and validation logic
✓ **UI Text Updates**: Changed onboarding placeholder from "Ex: Correios SP" to "Ex: Transportadora Local"

## Previous Changes (August 28, 2025)
✓ **Investment Management System**: Implemented comprehensive investor dashboard with portfolio tracking, analytics, and payment management
✓ **New Investor Role**: Added 'investor' role to user system with dedicated authentication and route protection
✓ **Investment Database Schema**: Created complete database structure with investment pools, investor profiles, investments, transactions, and performance history tables
✓ **Investment Dashboard**: Full-featured dashboard showing total invested, current value, returns, next payments, and pool performance
✓ **Investment Service**: Backend service handling portfolio calculations, performance metrics, opportunities, and transaction management
✓ **Investment Layout**: Apple-style sidebar navigation with Dashboard, Investments, Analytics, Payments, Notifications, and Settings
✓ **Sample Data**: Created demo investor account (investor@codashboard.com) with €25,000 investment showing 10% returns
✓ **API Routes**: Complete REST API for investment operations including dashboard data, opportunities, portfolio distribution, and transactions
✓ **Investment Simulator**: Built-in simulator for calculating returns based on initial amount, monthly contributions, and time periods
✓ **Multi-role Support**: Updated routing and layouts to support investor accounts alongside existing supplier, finance, and admin roles

## Previous Changes (August 27, 2025)
✓ **Critical Wallet Calculation Fix**: Resolved supplier wallet calculation bug where totalToReceive was incorrectly summing order values instead of using B2B product prices multiplied by actual quantities
✓ **Product Quantity Analysis**: Identified that 910 orders contain 926 total products (2 orders with multiple products + 14 products with quantity > 1), explaining the €200 difference
✓ **Accurate Financial Calculation**: System now correctly calculates 926 products × €12.50 = €11.575,00 instead of incorrectly using 910 orders × order value

## Previous Changes (August 26, 2025)
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
✓ **Critical Marketing Costs Data Isolation Fix**: Resolved major bug where marketing costs were being pulled from all operations instead of filtering by current operation - implemented proper storeId filtering through adAccounts relationship to ensure operation-specific cost display
✓ **Product Costs Fallback System Removed**: Eliminated fallback cost calculation system that was showing product and shipping costs even when no products were linked to the operation - now shows zero costs when no products are vinculados, providing accurate financial representation
✓ **Product Card Enhancement**: Added product thumbnails (96x96px) to the left side of product cards with automatic fallback to package icon when images fail to load or don't exist
✓ **Search Results Thumbnails**: Implemented consistent thumbnail display (64x64px) in product search results with same fallback system
✓ **Typography Improvements**: Set "Produtos Vinculados" title to 20px and product names to 18px for better visual hierarchy
✓ **B2B Price Display Fix**: Corrected Preço B2B field to show actual selling price (product.price) instead of cost price (product.costPrice), providing accurate pricing information for business operations
✓ **Product Thumbnails Fix**: Resolved missing product images in inside dashboard by adding imageUrl field to admin service getAllProducts() method
✓ **Cost Label Correction**: Updated "Custo para Operações" to "Custo para o Fornecedor" with correct costPrice display for better clarity

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