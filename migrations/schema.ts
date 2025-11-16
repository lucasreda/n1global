import { pgTable, index, foreignKey, text, numeric, jsonb, timestamp, varchar, boolean, integer, unique, date, interval, uuid } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const orders = pgTable("orders", {
	id: text().primaryKey().notNull(),
	customerId: text("customer_id"),
	customerName: text("customer_name"),
	customerEmail: text("customer_email"),
	customerPhone: text("customer_phone"),
	customerAddress: text("customer_address"),
	customerCity: text("customer_city"),
	customerState: text("customer_state"),
	customerCountry: text("customer_country"),
	customerZip: text("customer_zip"),
	status: text().notNull(),
	paymentStatus: text("payment_status"),
	paymentMethod: text("payment_method"),
	total: numeric({ precision: 10, scale:  2 }),
	currency: text().default('EUR'),
	products: jsonb(),
	provider: text().default('european_fulfillment').notNull(),
	providerOrderId: text("provider_order_id"),
	trackingNumber: text("tracking_number"),
	providerData: jsonb("provider_data"),
	orderDate: timestamp("order_date", { mode: 'string' }),
	lastStatusUpdate: timestamp("last_status_update", { mode: 'string' }),
	notes: text(),
	tags: text().array(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	storeId: varchar("store_id").notNull(),
	productCost: numeric("product_cost", { precision: 10, scale:  2 }).default('0'),
	shippingCost: numeric("shipping_cost", { precision: 10, scale:  2 }).default('0'),
	operationId: varchar("operation_id"),
	dataSource: text("data_source").default('shopify').notNull(),
	shopifyOrderId: text("shopify_order_id"),
	shopifyOrderNumber: text("shopify_order_number"),
	carrierImported: boolean("carrier_imported").default(false).notNull(),
	carrierMatchedAt: timestamp("carrier_matched_at", { mode: 'string' }),
	carrierOrderId: text("carrier_order_id"),
	shopifyData: jsonb("shopify_data"),
	affiliateId: varchar("affiliate_id"),
	affiliateTrackingId: text("affiliate_tracking_id"),
	landingSource: text("landing_source"),
	carrierConfirmation: text("carrier_confirmation"),
	syncedFromFhb: boolean("synced_from_fhb").default(false),
	needsSync: boolean("needs_sync").default(true),
	lastSyncAt: timestamp("last_sync_at", { mode: 'string' }),
}, (table) => [
	index("idx_orders_affiliate_id").using("btree", table.affiliateId.asc().nullsLast().op("text_ops")),
	index("idx_orders_carrier_order_id").using("btree", table.carrierOrderId.asc().nullsLast().op("text_ops")),
	index("idx_orders_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_orders_data_source").using("btree", table.dataSource.asc().nullsLast().op("text_ops")),
	index("idx_orders_operation_created").using("btree", table.operationId.asc().nullsLast().op("timestamp_ops"), table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_orders_operation_id").using("btree", table.operationId.asc().nullsLast().op("text_ops")),
	index("idx_orders_shopify_order_id").using("btree", table.shopifyOrderId.asc().nullsLast().op("text_ops")),
	index("idx_orders_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "orders_store_id_stores_id_fk"
		}),
	foreignKey({
			columns: [table.operationId],
			foreignColumns: [operations.id],
			name: "orders_operation_id_operations_id_fk"
		}),
	foreignKey({
			columns: [table.affiliateId],
			foreignColumns: [users.id],
			name: "orders_affiliate_id_fkey"
		}),
]);

export const dashboardMetrics = pgTable("dashboard_metrics", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	period: text().notNull(),
	provider: text(),
	totalOrders: integer("total_orders").default(0),
	deliveredOrders: integer("delivered_orders").default(0),
	cancelledOrders: integer("cancelled_orders").default(0),
	shippedOrders: integer("shipped_orders").default(0),
	pendingOrders: integer("pending_orders").default(0),
	totalRevenue: numeric("total_revenue", { precision: 12, scale:  2 }).default('0'),
	averageOrderValue: numeric("average_order_value", { precision: 8, scale:  2 }).default('0'),
	calculatedAt: timestamp("calculated_at", { mode: 'string' }).notNull(),
	validUntil: timestamp("valid_until", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	storeId: varchar("store_id").notNull(),
	operationId: varchar("operation_id"),
	returnedOrders: integer("returned_orders").default(0),
	confirmedOrders: integer("confirmed_orders").default(0),
	deliveredRevenue: numeric("delivered_revenue", { precision: 12, scale:  2 }).default('0'),
	totalProductCosts: numeric("total_product_costs", { precision: 12, scale:  2 }).default('0'),
	totalShippingCosts: numeric("total_shipping_costs", { precision: 12, scale:  2 }).default('0'),
	totalCombinedCosts: numeric("total_combined_costs", { precision: 12, scale:  2 }).default('0'),
	marketingCosts: numeric("marketing_costs", { precision: 12, scale:  2 }).default('0'),
	totalProfit: numeric("total_profit", { precision: 12, scale:  2 }).default('0'),
	profitMargin: numeric("profit_margin", { precision: 8, scale:  2 }).default('0'),
	roi: numeric({ precision: 8, scale:  2 }).default('0'),
	paidRevenue: numeric("paid_revenue", { precision: 12, scale:  2 }).default('0'),
	uniqueCustomers: integer("unique_customers").default(0),
	avgDeliveryTimeDays: numeric("avg_delivery_time_days", { precision: 8, scale:  2 }).default('0'),
	cacBrl: numeric("cac_brl", { precision: 12, scale:  2 }).default('0'),
	cacEur: numeric("cac_eur", { precision: 12, scale:  2 }).default('0'),
	cpaAdsBrl: numeric("cpa_ads_brl", { precision: 12, scale:  2 }).default('0'),
	cpaAdsEur: numeric("cpa_ads_eur", { precision: 12, scale:  2 }).default('0'),
}, (table) => [
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "dashboard_metrics_store_id_stores_id_fk"
		}),
	foreignKey({
			columns: [table.operationId],
			foreignColumns: [operations.id],
			name: "dashboard_metrics_operation_id_operations_id_fk"
		}),
]);

export const products = pgTable("products", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	sku: text().notNull(),
	name: text().notNull(),
	description: text(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	stock: integer().default(0).notNull(),
	lowStock: integer("low_stock").default(10).notNull(),
	imageUrl: text("image_url"),
	videoUrl: text("video_url"),
	productUrl: text("product_url"),
	isActive: boolean("is_active").default(true).notNull(),
	providers: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	costPrice: numeric("cost_price", { precision: 10, scale:  2 }),
	shippingCost: numeric("shipping_cost", { precision: 10, scale:  2 }),
	handlingFee: numeric("handling_fee", { precision: 10, scale:  2 }),
	marketingCost: numeric("marketing_cost", { precision: 10, scale:  2 }),
	operationalCost: numeric("operational_cost", { precision: 10, scale:  2 }),
	profitMargin: numeric("profit_margin", { precision: 5, scale:  2 }),
	lastCostUpdate: timestamp("last_cost_update", { mode: 'string' }),
	storeId: varchar("store_id").notNull(),
	operationId: varchar("operation_id"),
	type: text().default('fisico').notNull(),
	supplierId: varchar("supplier_id"),
	initialStock: integer("initial_stock").default(0),
	status: varchar({ length: 50 }).default('pending').notNull(),
	weight: numeric({ precision: 10, scale:  2 }),
	height: numeric({ precision: 10, scale:  2 }),
	width: numeric({ precision: 10, scale:  2 }),
	depth: numeric({ precision: 10, scale:  2 }),
	availableCountries: text("available_countries").array(),
}, (table) => [
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "products_store_id_stores_id_fk"
		}),
	foreignKey({
			columns: [table.operationId],
			foreignColumns: [operations.id],
			name: "products_operation_id_operations_id_fk"
		}),
	foreignKey({
			columns: [table.supplierId],
			foreignColumns: [users.id],
			name: "products_supplier_id_users_id_fk"
		}),
	unique("products_sku_unique").on(table.sku),
]);

export const facebookBusinessManagers = pgTable("facebook_business_managers", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	businessId: varchar("business_id", { length: 255 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	accessToken: text("access_token"),
	isActive: boolean("is_active").default(true),
	lastSync: timestamp("last_sync", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("facebook_business_managers_business_id_unique").on(table.businessId),
]);

export const facebookAdAccounts = pgTable("facebook_ad_accounts", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	accountId: varchar("account_id", { length: 255 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	accessToken: text("access_token"),
	appId: varchar("app_id", { length: 255 }),
	appSecret: text("app_secret"),
	isActive: boolean("is_active").default(true),
	currency: varchar({ length: 10 }).default('EUR'),
	timezone: varchar({ length: 50 }).default('Europe/Rome'),
	lastSync: timestamp("last_sync", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	businessManagerId: varchar("business_manager_id", { length: 255 }),
	baseCurrency: varchar("base_currency", { length: 10 }).default('BRL'),
}, (table) => [
	unique("facebook_ad_accounts_account_id_unique").on(table.accountId),
]);

export const facebookCampaigns = pgTable("facebook_campaigns", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	campaignId: varchar("campaign_id", { length: 255 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	status: varchar({ length: 50 }).notNull(),
	objective: varchar({ length: 100 }),
	dailyBudget: numeric("daily_budget", { precision: 10, scale:  2 }),
	lifetimeBudget: numeric("lifetime_budget", { precision: 10, scale:  2 }),
	amountSpent: numeric("amount_spent", { precision: 10, scale:  2 }).default('0'),
	impressions: integer().default(0),
	clicks: integer().default(0),
	cpm: numeric({ precision: 10, scale:  2 }).default('0'),
	cpc: numeric({ precision: 10, scale:  2 }).default('0'),
	ctr: numeric({ precision: 10, scale:  4 }).default('0'),
	isSelected: boolean("is_selected").default(false),
	startTime: timestamp("start_time", { mode: 'string' }),
	endTime: timestamp("end_time", { mode: 'string' }),
	lastSync: timestamp("last_sync", { mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	originalAmountSpent: numeric("original_amount_spent", { precision: 10, scale:  2 }),
	originalCurrency: varchar("original_currency", { length: 10 }).default('USD'),
	accountId: varchar("account_id", { length: 255 }).notNull(),
}, (table) => [
	unique("facebook_campaigns_campaign_id_unique").on(table.campaignId),
]);

export const campaigns = pgTable("campaigns", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	network: varchar({ length: 20 }).notNull(),
	campaignId: varchar("campaign_id", { length: 255 }).notNull(),
	accountId: varchar("account_id", { length: 255 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	status: varchar({ length: 50 }).notNull(),
	objective: varchar({ length: 100 }),
	campaignType: varchar("campaign_type", { length: 100 }),
	dailyBudget: numeric("daily_budget", { precision: 10, scale:  2 }),
	lifetimeBudget: numeric("lifetime_budget", { precision: 10, scale:  2 }),
	amountSpent: numeric("amount_spent", { precision: 10, scale:  2 }).default('0'),
	originalAmountSpent: numeric("original_amount_spent", { precision: 10, scale:  2 }),
	originalCurrency: varchar("original_currency", { length: 10 }).default('USD'),
	impressions: integer().default(0),
	clicks: integer().default(0),
	cpm: numeric({ precision: 10, scale:  2 }).default('0'),
	cpc: numeric({ precision: 10, scale:  2 }).default('0'),
	ctr: numeric({ precision: 10, scale:  4 }).default('0'),
	isSelected: boolean("is_selected").default(false),
	startTime: timestamp("start_time", { mode: 'string' }),
	endTime: timestamp("end_time", { mode: 'string' }),
	lastSync: timestamp("last_sync", { mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const stores = pgTable("stores", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	ownerId: varchar("owner_id").notNull(),
	settings: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const users = pgTable("users", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	password: text().notNull(),
	role: text().default('user').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	storeId: varchar("store_id"),
	onboardingCompleted: boolean("onboarding_completed").default(false),
	onboardingSteps: jsonb("onboarding_steps").default({"step4_ads":false,"step5_sync":false,"step2_shopify":false,"step3_shipping":false,"step1_operation":false}),
	permissions: jsonb().default([]),
	onboardingCardHidden: boolean("onboarding_card_hidden").default(false),
	tourCompleted: boolean("tour_completed").default(false),
	isActive: boolean("is_active").default(true),
	forcePasswordChange: boolean("force_password_change").default(false),
	lastLoginAt: timestamp("last_login_at", { mode: 'string' }),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const adAccounts = pgTable("ad_accounts", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	network: varchar({ length: 20 }).notNull(),
	accountId: varchar("account_id", { length: 255 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	businessManagerId: varchar("business_manager_id", { length: 255 }),
	managerId: varchar("manager_id", { length: 255 }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	appId: varchar("app_id", { length: 255 }),
	appSecret: text("app_secret"),
	clientId: varchar("client_id", { length: 255 }),
	clientSecret: text("client_secret"),
	isActive: boolean("is_active").default(true),
	currency: varchar({ length: 10 }).default('EUR'),
	baseCurrency: varchar("base_currency", { length: 10 }).default('BRL'),
	timezone: varchar({ length: 50 }).default('Europe/Rome'),
	lastSync: timestamp("last_sync", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	storeId: varchar("store_id").notNull(),
	operationId: varchar("operation_id"),
}, (table) => [
	index("idx_ad_accounts_network").using("btree", table.network.asc().nullsLast().op("text_ops")),
	index("idx_ad_accounts_operation_id").using("btree", table.operationId.asc().nullsLast().op("text_ops")),
	index("idx_ad_accounts_store_id").using("btree", table.storeId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "ad_accounts_store_id_stores_id_fk"
		}),
	foreignKey({
			columns: [table.operationId],
			foreignColumns: [operations.id],
			name: "ad_accounts_operation_id_operations_id_fk"
		}),
]);

export const shippingProviders = pgTable("shipping_providers", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	apiUrl: text("api_url"),
	isActive: boolean("is_active").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	storeId: varchar("store_id").notNull(),
	type: text().default('custom').notNull(),
	apiKey: text("api_key"),
	description: text(),
	login: text(),
	password: text(),
	lastTestAt: timestamp("last_test_at", { mode: 'string' }),
	operationId: varchar("operation_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "shipping_providers_store_id_stores_id_fk"
		}),
	foreignKey({
			columns: [table.operationId],
			foreignColumns: [operations.id],
			name: "shipping_providers_operation_id_operations_id_fk"
		}),
]);

export const syncJobs = pgTable("sync_jobs", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	provider: text().notNull(),
	type: text().notNull(),
	status: text().notNull(),
	startedAt: timestamp("started_at", { mode: 'string' }).notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	ordersProcessed: integer("orders_processed").default(0),
	ordersCreated: integer("orders_created").default(0),
	ordersUpdated: integer("orders_updated").default(0),
	errorCount: integer("error_count").default(0),
	lastProcessedId: text("last_processed_id"),
	logs: jsonb(),
	error: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	storeId: varchar("store_id").notNull(),
	operationId: varchar("operation_id"),
}, (table) => [
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "sync_jobs_store_id_stores_id_fk"
		}),
	foreignKey({
			columns: [table.operationId],
			foreignColumns: [operations.id],
			name: "sync_jobs_operation_id_operations_id_fk"
		}),
]);

export const facebookAdsIntegrations = pgTable("facebook_ads_integrations", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	operationId: varchar("operation_id").notNull(),
	accountId: text("account_id").notNull(),
	accountName: text("account_name"),
	accessToken: text("access_token").notNull(),
	selectedCampaignIds: text("selected_campaign_ids").array().default([""]),
	status: text().default('active').notNull(),
	lastSyncAt: timestamp("last_sync_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.operationId],
			foreignColumns: [operations.id],
			name: "facebook_ads_integrations_operation_id_operations_id_fk"
		}),
]);

export const userOperationAccess = pgTable("user_operation_access", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	operationId: varchar("operation_id").notNull(),
	role: text().default('viewer').notNull(),
	permissions: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_operation_access_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.operationId],
			foreignColumns: [operations.id],
			name: "user_operation_access_operation_id_operations_id_fk"
		}),
]);

export const operations = pgTable("operations", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	storeId: varchar("store_id").notNull(),
	status: text().default('active').notNull(),
	settings: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	country: text().notNull(),
	currency: text().default('EUR').notNull(),
	supportServiceActive: boolean("support_service_active").default(false).notNull(),
	operationType: text("operation_type").default('Cash on Delivery').notNull(),
	ownerId: varchar("owner_id"),
	timezone: text().default('Europe/Madrid').notNull(),
	shopifyOrderPrefix: text("shopify_order_prefix"),
}, (table) => [
	index("idx_operations_country").using("btree", table.country.asc().nullsLast().op("text_ops")),
	index("idx_operations_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "operations_store_id_stores_id_fk"
		}),
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [users.id],
			name: "operations_owner_id_fkey"
		}),
]);

export const fulfillmentIntegrations = pgTable("fulfillment_integrations", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	operationId: varchar("operation_id").notNull(),
	provider: text().notNull(),
	credentials: jsonb().notNull(),
	status: text().default('active').notNull(),
	lastSyncAt: timestamp("last_sync_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	fhbAccountId: varchar("fhb_account_id"),
}, (table) => [
	foreignKey({
			columns: [table.operationId],
			foreignColumns: [operations.id],
			name: "fulfillment_integrations_operation_id_operations_id_fk"
		}),
	foreignKey({
			columns: [table.fhbAccountId],
			foreignColumns: [fhbAccounts.id],
			name: "fulfillment_integrations_fhb_account_id_fkey"
		}),
]);

export const orderStatusHistory = pgTable("order_status_history", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	orderId: text("order_id").notNull(),
	previousStatus: text("previous_status"),
	newStatus: text("new_status").notNull(),
	comment: text(),
	changedAt: timestamp("changed_at", { mode: 'string' }).notNull(),
	providerData: jsonb("provider_data"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "order_status_history_order_id_orders_id_fk"
		}),
]);

export const shopifyIntegrations = pgTable("shopify_integrations", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	operationId: varchar("operation_id").notNull(),
	shopName: text("shop_name").notNull(),
	accessToken: text("access_token").notNull(),
	status: text().default('pending').notNull(),
	lastSyncAt: timestamp("last_sync_at", { mode: 'string' }),
	syncErrors: text("sync_errors"),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_shopify_integrations_operation_id").using("btree", table.operationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.operationId],
			foreignColumns: [operations.id],
			name: "shopify_integrations_operation_id_operations_id_fk"
		}),
]);

export const investorProfiles = pgTable("investor_profiles", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	birthDate: timestamp("birth_date", { mode: 'string' }),
	nationality: text(),
	phone: text(),
	address: text(),
	city: text(),
	postalCode: text("postal_code"),
	country: text(),
	riskTolerance: text("risk_tolerance").default('medium'),
	investmentExperience: text("investment_experience").default('beginner'),
	investmentGoals: text("investment_goals"),
	monthlyIncomeRange: text("monthly_income_range"),
	bankName: text("bank_name"),
	accountNumber: text("account_number"),
	routingNumber: text("routing_number"),
	accountHolderName: text("account_holder_name"),
	kycStatus: text("kyc_status").default('pending'),
	kycDocuments: jsonb("kyc_documents"),
	verifiedAt: timestamp("verified_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "investor_profiles_user_id_users_id_fk"
		}),
	unique("investor_profiles_user_id_unique").on(table.userId),
]);

export const userProducts = pgTable("user_products", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	storeId: varchar("store_id").notNull(),
	productId: varchar("product_id").notNull(),
	sku: text().notNull(),
	customCostPrice: numeric("custom_cost_price", { precision: 10, scale:  2 }),
	customShippingCost: numeric("custom_shipping_cost", { precision: 10, scale:  2 }),
	customHandlingFee: numeric("custom_handling_fee", { precision: 10, scale:  2 }),
	linkedAt: timestamp("linked_at", { mode: 'string' }).defaultNow(),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).defaultNow(),
	isActive: boolean("is_active").default(true).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_products_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "user_products_store_id_stores_id_fk"
		}),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "user_products_product_id_products_id_fk"
		}),
]);

export const productContracts = pgTable("product_contracts", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	productId: varchar("product_id").notNull(),
	supplierId: varchar("supplier_id").notNull(),
	adminId: varchar("admin_id").notNull(),
	contractTitle: text("contract_title").default('Contrato de Fornecimento de Produto').notNull(),
	contractContent: text("contract_content").notNull(),
	contractTerms: jsonb("contract_terms"),
	status: varchar({ length: 50 }).default('sent').notNull(),
	sentAt: timestamp("sent_at", { mode: 'string' }).defaultNow(),
	viewedAt: timestamp("viewed_at", { mode: 'string' }),
	respondedAt: timestamp("responded_at", { mode: 'string' }),
	deliveryDays: integer("delivery_days").default(30),
	minimumOrder: integer("minimum_order").default(1),
	commissionRate: numeric("commission_rate", { precision: 5, scale:  2 }).default('15.00'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_contracts_product_id_products_id_fk"
		}),
	foreignKey({
			columns: [table.supplierId],
			foreignColumns: [users.id],
			name: "product_contracts_supplier_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.adminId],
			foreignColumns: [users.id],
			name: "product_contracts_admin_id_users_id_fk"
		}),
]);

export const supplierPaymentItems = pgTable("supplier_payment_items", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	paymentId: varchar("payment_id").notNull(),
	orderId: text("order_id"),
	productSku: text("product_sku"),
	quantity: integer().default(1).notNull(),
	unitPrice: numeric("unit_price", { precision: 10, scale:  2 }).notNull(),
	totalAmount: numeric("total_amount", { precision: 10, scale:  2 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.paymentId],
			foreignColumns: [supplierPayments.id],
			name: "supplier_payment_items_payment_id_supplier_payments_id_fk"
		}),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "supplier_payment_items_order_id_orders_id_fk"
		}),
]);

export const supplierPayments = pgTable("supplier_payments", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	supplierId: varchar("supplier_id").notNull(),
	storeId: varchar("store_id").notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	currency: text().default('EUR').notNull(),
	description: text(),
	status: text().default('pending').notNull(),
	paymentMethod: text("payment_method"),
	dueDate: timestamp("due_date", { mode: 'string' }),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	paidAt: timestamp("paid_at", { mode: 'string' }),
	referenceId: text("reference_id"),
	bankDetails: jsonb("bank_details"),
	notes: text(),
	approvedBy: varchar("approved_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	amountBrl: numeric("amount_brl", { precision: 12, scale:  2 }),
	exchangeRate: numeric("exchange_rate", { precision: 10, scale:  4 }),
}, (table) => [
	foreignKey({
			columns: [table.supplierId],
			foreignColumns: [users.id],
			name: "supplier_payments_supplier_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "supplier_payments_store_id_stores_id_fk"
		}),
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "supplier_payments_approved_by_users_id_fk"
		}),
]);

export const investmentPools = pgTable("investment_pools", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	totalValue: numeric("total_value", { precision: 15, scale:  2 }).default('0').notNull(),
	totalInvested: numeric("total_invested", { precision: 15, scale:  2 }).default('0').notNull(),
	monthlyReturn: numeric("monthly_return", { precision: 5, scale:  4 }).default('0'),
	yearlyReturn: numeric("yearly_return", { precision: 5, scale:  4 }).default('0'),
	status: text().default('active').notNull(),
	minInvestment: numeric("min_investment", { precision: 10, scale:  2 }).default('1000').notNull(),
	currency: text().default('BRL').notNull(),
	riskLevel: text("risk_level").default('medium').notNull(),
	investmentStrategy: text("investment_strategy"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	slug: text().notNull(),
	cnpj: text(),
	cvmRegistration: text("cvm_registration"),
	auditReport: text("audit_report"),
	portfolioComposition: jsonb("portfolio_composition"),
	managementFeeRate: numeric("management_fee_rate", { precision: 5, scale:  4 }).default('0'),
	administrativeExpenses: numeric("administrative_expenses", { precision: 10, scale:  2 }).default('0'),
	irRetentionHistory: jsonb("ir_retention_history"),
	benchmarkIndex: text("benchmark_index").default('CDI'),
	comeCotasRate: numeric("come_cotas_rate", { precision: 5, scale:  4 }).default('0'),
	custodyProvider: text("custody_provider"),
	liquidationProcess: text("liquidation_process"),
	monthlyReports: jsonb("monthly_reports"),
}, (table) => [
	unique("investment_pools_slug_unique").on(table.slug),
]);

export const investments = pgTable("investments", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	investorId: varchar("investor_id").notNull(),
	poolId: varchar("pool_id").notNull(),
	totalInvested: numeric("total_invested", { precision: 12, scale:  2 }).default('0').notNull(),
	currentValue: numeric("current_value", { precision: 12, scale:  2 }).default('0').notNull(),
	totalReturns: numeric("total_returns", { precision: 12, scale:  2 }).default('0').notNull(),
	totalPaidOut: numeric("total_paid_out", { precision: 12, scale:  2 }).default('0').notNull(),
	returnRate: numeric("return_rate", { precision: 5, scale:  4 }).default('0'),
	monthlyReturn: numeric("monthly_return", { precision: 5, scale:  4 }).default('0'),
	status: text().default('active').notNull(),
	firstInvestmentDate: timestamp("first_investment_date", { mode: 'string' }),
	lastTransactionDate: timestamp("last_transaction_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.investorId],
			foreignColumns: [users.id],
			name: "investments_investor_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.poolId],
			foreignColumns: [investmentPools.id],
			name: "investments_pool_id_investment_pools_id_fk"
		}),
]);

export const investmentTransactions = pgTable("investment_transactions", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	investmentId: varchar("investment_id").notNull(),
	investorId: varchar("investor_id").notNull(),
	poolId: varchar("pool_id").notNull(),
	type: text().notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	currency: text().default('EUR').notNull(),
	paymentMethod: text("payment_method"),
	paymentReference: text("payment_reference"),
	paymentStatus: text("payment_status").default('pending'),
	description: text(),
	metadata: jsonb(),
	processedAt: timestamp("processed_at", { mode: 'string' }),
	processedBy: varchar("processed_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.investmentId],
			foreignColumns: [investments.id],
			name: "investment_transactions_investment_id_investments_id_fk"
		}),
	foreignKey({
			columns: [table.investorId],
			foreignColumns: [users.id],
			name: "investment_transactions_investor_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.poolId],
			foreignColumns: [investmentPools.id],
			name: "investment_transactions_pool_id_investment_pools_id_fk"
		}),
	foreignKey({
			columns: [table.processedBy],
			foreignColumns: [users.id],
			name: "investment_transactions_processed_by_users_id_fk"
		}),
]);

export const poolPerformanceHistory = pgTable("pool_performance_history", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	poolId: varchar("pool_id").notNull(),
	period: text().notNull(),
	periodDate: timestamp("period_date", { mode: 'string' }).notNull(),
	totalValue: numeric("total_value", { precision: 15, scale:  2 }).notNull(),
	totalInvested: numeric("total_invested", { precision: 15, scale:  2 }).notNull(),
	returnRate: numeric("return_rate", { precision: 5, scale:  4 }).notNull(),
	benchmarkReturn: numeric("benchmark_return", { precision: 5, scale:  4 }),
	numberOfInvestors: integer("number_of_investors").default(0),
	newInvestments: numeric("new_investments", { precision: 12, scale:  2 }).default('0'),
	withdrawals: numeric({ precision: 12, scale:  2 }).default('0'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.poolId],
			foreignColumns: [investmentPools.id],
			name: "pool_performance_history_pool_id_investment_pools_id_fk"
		}),
]);

export const investmentTaxCalculations = pgTable("investment_tax_calculations", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	investorId: varchar("investor_id").notNull(),
	taxYear: integer("tax_year").notNull(),
	referenceMonth: integer("reference_month"),
	totalGains: numeric("total_gains", { precision: 12, scale:  2 }).default('0').notNull(),
	taxableAmount: numeric("taxable_amount", { precision: 12, scale:  2 }).default('0').notNull(),
	taxRate: numeric("tax_rate", { precision: 5, scale:  4 }).notNull(),
	taxDue: numeric("tax_due", { precision: 12, scale:  2 }).default('0').notNull(),
	taxPaid: numeric("tax_paid", { precision: 12, scale:  2 }).default('0').notNull(),
	status: text().default('pending').notNull(),
	dueDate: timestamp("due_date", { mode: 'string' }),
	paidDate: timestamp("paid_date", { mode: 'string' }),
	calculationDetails: jsonb("calculation_details"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.investorId],
			foreignColumns: [users.id],
			name: "investment_tax_calculations_investor_id_users_id_fk"
		}),
]);

export const paymentReceipts = pgTable("payment_receipts", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	transactionId: varchar("transaction_id").notNull(),
	investorId: varchar("investor_id").notNull(),
	receiptNumber: text("receipt_number"),
	receiptType: text("receipt_type").notNull(),
	fileUrl: text("file_url"),
	fileName: text("file_name"),
	fileSize: integer("file_size"),
	fileMimeType: text("file_mime_type"),
	bankName: text("bank_name"),
	accountNumber: text("account_number"),
	routingNumber: text("routing_number"),
	authenticationCode: text("authentication_code"),
	fundSource: text("fund_source").notNull(),
	fundSourceDescription: text("fund_source_description"),
	fundSourceDocuments: jsonb("fund_source_documents"),
	isVerified: boolean("is_verified").default(false),
	verifiedBy: varchar("verified_by"),
	verifiedAt: timestamp("verified_at", { mode: 'string' }),
	verificationNotes: text("verification_notes"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.transactionId],
			foreignColumns: [investmentTransactions.id],
			name: "payment_receipts_transaction_id_investment_transactions_id_fk"
		}),
	foreignKey({
			columns: [table.investorId],
			foreignColumns: [users.id],
			name: "payment_receipts_investor_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.verifiedBy],
			foreignColumns: [users.id],
			name: "payment_receipts_verified_by_users_id_fk"
		}),
]);

export const taxPaymentSchedule = pgTable("tax_payment_schedule", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	investorId: varchar("investor_id").notNull(),
	calculationId: varchar("calculation_id"),
	taxType: text("tax_type").notNull(),
	paymentType: text("payment_type").notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	dueDate: timestamp("due_date", { mode: 'string' }).notNull(),
	reminderDate: timestamp("reminder_date", { mode: 'string' }),
	status: text().default('scheduled').notNull(),
	paidDate: timestamp("paid_date", { mode: 'string' }),
	paymentReference: text("payment_reference"),
	reminderSent: boolean("reminder_sent").default(false),
	reminderSentAt: timestamp("reminder_sent_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.investorId],
			foreignColumns: [users.id],
			name: "tax_payment_schedule_investor_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.calculationId],
			foreignColumns: [investmentTaxCalculations.id],
			name: "tax_payment_schedule_calculation_id_investment_tax_calculations"
		}),
]);

export const currencyHistory = pgTable("currency_history", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	date: text().notNull(),
	eurToBrl: numeric("eur_to_brl", { precision: 10, scale:  6 }).notNull(),
	source: text().default('currencyapi').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	usdToBrl: numeric("usd_to_brl", { precision: 10, scale:  6 }),
	gbpToBrl: numeric("gbp_to_brl", { precision: 10, scale:  6 }),
	arsToBrl: numeric("ars_to_brl", { precision: 10, scale:  6 }),
	clpToBrl: numeric("clp_to_brl", { precision: 10, scale:  6 }),
	cadToBrl: numeric("cad_to_brl", { precision: 10, scale:  6 }),
	audToBrl: numeric("aud_to_brl", { precision: 10, scale:  6 }),
	jpyToBrl: numeric("jpy_to_brl", { precision: 10, scale:  6 }),
});

export const manualAdSpend = pgTable("manual_ad_spend", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	operationId: varchar("operation_id").notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	currency: text().default('BRL').notNull(),
	platform: text().notNull(),
	spendDate: timestamp("spend_date", { mode: 'string' }).notNull(),
	description: text(),
	notes: text(),
	createdBy: varchar("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.operationId],
			foreignColumns: [operations.id],
			name: "manual_ad_spend_operation_id_operations_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "manual_ad_spend_created_by_users_id_fk"
		}),
]);

export const currencySettings = pgTable("currency_settings", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id"),
	currency: text().notNull(),
	enabled: boolean().default(true).notNull(),
	baseCurrency: text("base_currency").default('BRL').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const supportCategories = pgTable("support_categories", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: varchar().notNull(),
	displayName: varchar("display_name").notNull(),
	description: text(),
	isAutomated: boolean("is_automated").default(true),
	priority: integer().default(1),
	color: varchar().default('#3b82f6'),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("support_categories_name_key").on(table.name),
]);

export const supportResponses = pgTable("support_responses", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	categoryId: varchar("category_id").notNull(),
	name: varchar().notNull(),
	subject: varchar(),
	textContent: text("text_content"),
	htmlContent: text("html_content"),
	isDefault: boolean("is_default").default(false),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	variables: jsonb(),
	delayMinutes: integer("delay_minutes").default(0),
	timesUsed: integer("times_used").default(0),
	lastUsed: timestamp("last_used", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [supportCategories.id],
			name: "support_responses_category_id_fkey"
		}).onDelete("cascade"),
]);

export const supportConversations = pgTable("support_conversations", {
	id: varchar().default((gen_random_uuid())).primaryKey().notNull(),
	ticketId: varchar("ticket_id"),
	type: varchar({ length: 20 }).default('note').notNull(),
	content: text().notNull(),
	isPublic: boolean("is_public").default(true).notNull(),
	userId: varchar("user_id"),
	attachments: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	fromEmail: text("from_email"),
	toEmail: text("to_email"),
	subject: text(),
	messageId: text("message_id"),
	from: text(),
	to: text(),
	isInternal: boolean("is_internal").default(false),
}, (table) => [
	foreignKey({
			columns: [table.ticketId],
			foreignColumns: [supportTickets.id],
			name: "support_conversations_ticket_id_fkey"
		}),
]);

export const supportMetrics = pgTable("support_metrics", {
	id: varchar().default((gen_random_uuid())).primaryKey().notNull(),
	date: date().notNull(),
	categoryId: varchar("category_id"),
	emailsReceived: integer("emails_received").default(0).notNull(),
	ticketsCreated: integer("tickets_created").default(0).notNull(),
	ticketsResolved: integer("tickets_resolved").default(0).notNull(),
	avgResponseTimeMinutes: integer("avg_response_time_minutes"),
	autoResponsesSent: integer("auto_responses_sent").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [supportCategories.id],
			name: "support_metrics_category_id_fkey"
		}),
	unique("support_metrics_date_category_id_key").on(table.date, table.categoryId),
]);

export const customerSupportOperations = pgTable("customer_support_operations", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	operationId: varchar("operation_id").notNull(),
	operationName: varchar("operation_name").notNull(),
	emailDomain: varchar("email_domain").notNull(),
	isCustomDomain: boolean("is_custom_domain").default(false),
	mailgunDomainName: varchar("mailgun_domain_name"),
	domainVerified: boolean("domain_verified").default(false),
	aiEnabled: boolean("ai_enabled").default(true),
	aiCategories: jsonb("ai_categories"),
	brandingConfig: jsonb("branding_config"),
	businessHours: jsonb("business_hours"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	mailgunApiKey: varchar("mailgun_api_key"),
	mailgunWebhookKey: varchar("mailgun_webhook_key"),
	emailTemplateId: varchar("email_template_id"),
	autoResponseEnabled: boolean("auto_response_enabled").default(true),
	timezone: varchar().default('America/Sao_Paulo'),
	isActive: boolean("is_active").default(true),
	emailPrefix: varchar("email_prefix").default('suporte'),
});

export const customerSupportEmails = pgTable("customer_support_emails", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	operationId: varchar("operation_id").notNull(),
	messageId: varchar("message_id"),
	threadId: varchar("thread_id"),
	fromEmail: varchar("from_email").notNull(),
	fromName: varchar("from_name"),
	toEmail: varchar("to_email").notNull(),
	toName: varchar("to_name"),
	ccEmails: jsonb("cc_emails"),
	bccEmails: jsonb("bcc_emails"),
	subject: text().notNull(),
	content: text().notNull(),
	htmlContent: text("html_content"),
	mailgunMessageId: varchar("mailgun_message_id"),
	status: varchar().default('pending'),
	bounceReason: text("bounce_reason"),
	headers: jsonb(),
	rawData: jsonb("raw_data"),
	receivedAt: timestamp("received_at", { mode: 'string' }),
	processedAt: timestamp("processed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const customerSupportCategories = pgTable("customer_support_categories", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	operationId: varchar("operation_id").notNull(),
	name: varchar().notNull(),
	displayName: varchar("display_name").notNull(),
	description: text(),
	isAutomated: boolean("is_automated").default(false),
	aiEnabled: boolean("ai_enabled").default(false),
	priority: integer().default(0),
	color: varchar().default('#6b7280'),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	defaultResponse: text("default_response"),
});

export const supportTickets = pgTable("support_tickets", {
	id: varchar().default((gen_random_uuid())).primaryKey().notNull(),
	ticketNumber: varchar("ticket_number", { length: 50 }).notNull(),
	emailId: varchar("email_id"),
	categoryId: varchar("category_id"),
	customerEmail: varchar("customer_email", { length: 255 }).notNull(),
	customerName: varchar("customer_name", { length: 255 }),
	subject: text().notNull(),
	priority: varchar({ length: 10 }).default('low').notNull(),
	status: varchar({ length: 20 }).default('open').notNull(),
	assignedToUserId: varchar("assigned_to_user_id"),
	conversationCount: integer("conversation_count").default(0).notNull(),
	lastActivity: timestamp("last_activity", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	description: text().notNull(),
	resolution: text(),
	resolvedByUserId: varchar("resolved_by_user_id"),
	responseTime: integer("response_time"),
	resolutionTime: integer("resolution_time"),
	tags: text().array().default(["RAY"]),
	internalNotes: text("internal_notes"),
	isRead: boolean("is_read").default(false).notNull(),
	retentionAttempts: integer("retention_attempts").default(0).notNull(),
	escalationReason: text("escalation_reason"),
	refundOffered: boolean("refund_offered").default(false).notNull(),
	refundOfferedAt: timestamp("refund_offered_at", { mode: 'string' }),
	linkedOrderId: text("linked_order_id"),
	orderMatchConfidence: text("order_match_confidence"),
	orderMatchMethod: text("order_match_method"),
	orderLinkedAt: timestamp("order_linked_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.emailId],
			foreignColumns: [supportEmails.id],
			name: "support_tickets_email_id_fkey"
		}),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [supportCategories.id],
			name: "support_tickets_category_id_fkey"
		}),
	foreignKey({
			columns: [table.linkedOrderId],
			foreignColumns: [orders.id],
			name: "support_tickets_linked_order_id_fkey"
		}),
	unique("support_tickets_ticket_number_key").on(table.ticketNumber),
]);

export const customerSupportTickets = pgTable("customer_support_tickets", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	operationId: varchar("operation_id").notNull(),
	ticketNumber: varchar("ticket_number").notNull(),
	customerEmail: varchar("customer_email").notNull(),
	customerName: varchar("customer_name"),
	subject: text().notNull(),
	status: varchar().default('open'),
	priority: varchar().default('medium'),
	categoryName: varchar("category_name"),
	categoryId: varchar("category_id"),
	assignedAgentId: varchar("assigned_agent_id"),
	isAutomated: boolean("is_automated").default(false),
	tags: jsonb(),
	metadata: jsonb(),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	resolutionTime: interval("resolution_time"),
	lastActivity: timestamp("last_activity", { mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	assignedAgentName: varchar("assigned_agent_name"),
	requiresHuman: boolean("requires_human").default(false),
	conversationCount: integer("conversation_count").default(0),
	isRead: boolean("is_read").default(false),
	aiConfidence: numeric("ai_confidence", { precision: 5, scale:  2 }),
	aiReasoning: text("ai_reasoning"),
	originalEmailId: varchar("original_email_id"),
	threadId: varchar("thread_id"),
	resolutionTimeMinutes: integer("resolution_time_minutes"),
	customerSatisfaction: integer("customer_satisfaction"),
});

export const customerSupportMessages = pgTable("customer_support_messages", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	operationId: varchar("operation_id").notNull(),
	ticketId: varchar("ticket_id").notNull(),
	sender: varchar().notNull(),
	senderName: varchar("sender_name"),
	senderEmail: varchar("sender_email"),
	subject: text(),
	content: text().notNull(),
	htmlContent: text("html_content"),
	messageType: varchar("message_type").default('message'),
	isInternal: boolean("is_internal").default(false),
	sentViaEmail: boolean("sent_via_email").default(false),
	emailSentAt: timestamp("email_sent_at", { mode: 'string' }),
	attachments: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	senderUserId: varchar("sender_user_id"),
	isPublic: boolean("is_public").default(true),
	isAiGenerated: boolean("is_ai_generated").default(false),
	aiModel: text("ai_model"),
	aiPromptUsed: text("ai_prompt_used"),
	emailMessageId: text("email_message_id"),
	emailInReplyTo: text("email_in_reply_to"),
	emailReferences: text("email_references"),
	emailDelivered: boolean("email_delivered").default(false),
	emailOpened: boolean("email_opened").default(false),
	emailClicked: boolean("email_clicked").default(false),
	emailError: text("email_error"),
	priority: integer().default(1),
}, (table) => [
	foreignKey({
			columns: [table.senderUserId],
			foreignColumns: [users.id],
			name: "customer_support_messages_sender_user_id_fkey"
		}),
]);

export const supportEmails = pgTable("support_emails", {
	id: varchar().default((gen_random_uuid())).primaryKey().notNull(),
	messageId: varchar("message_id", { length: 255 }),
	fromEmail: varchar("from_email", { length: 255 }).notNull(),
	toEmail: varchar("to_email", { length: 255 }).notNull(),
	subject: text(),
	textContent: text("text_content"),
	htmlContent: text("html_content"),
	attachments: jsonb(),
	categoryId: varchar("category_id"),
	aiConfidence: integer("ai_confidence"),
	aiReasoning: text("ai_reasoning"),
	status: varchar({ length: 20 }).default('received').notNull(),
	requiresHuman: boolean("requires_human").default(true).notNull(),
	hasAutoResponse: boolean("has_auto_response").default(false).notNull(),
	autoResponseSentAt: timestamp("auto_response_sent_at", { mode: 'string' }),
	rawData: jsonb("raw_data"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	isUrgent: boolean("is_urgent").default(false).notNull(),
	receivedAt: timestamp("received_at", { mode: 'string' }).defaultNow(),
	processedAt: timestamp("processed_at", { mode: 'string' }),
	inReplyTo: text("in_reply_to"),
	references: text(),
	sentiment: text(),
	emotion: text(),
	urgency: text(),
	tone: text(),
	hasTimeConstraint: boolean("has_time_constraint"),
	escalationRisk: integer("escalation_risk"),
}, (table) => [
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [supportCategories.id],
			name: "support_emails_category_id_fkey"
		}),
	unique("support_emails_message_id_key").on(table.messageId),
]);

export const aiDirectives = pgTable("ai_directives", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	operationId: varchar("operation_id").notNull(),
	type: varchar({ length: 50 }).notNull(),
	title: text().notNull(),
	content: text().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	sortOrder: integer("sort_order").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("ai_directives_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("ai_directives_operation_idx").using("btree", table.operationId.asc().nullsLast().op("text_ops")),
	index("ai_directives_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.operationId],
			foreignColumns: [operations.id],
			name: "ai_directives_operation_id_fkey"
		}).onDelete("cascade"),
]);

export const creativeAnalyses = pgTable("creative_analyses", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	creativeId: varchar("creative_id").notNull(),
	operationId: varchar("operation_id").notNull(),
	analysisType: varchar("analysis_type").notNull(),
	model: varchar().notNull(),
	insights: jsonb(),
	recommendations: jsonb(),
	performanceScore: integer("performance_score"),
	engagementScore: integer("engagement_score"),
	creativeScore: integer("creative_score"),
	improvementSuggestions: text("improvement_suggestions").array(),
	competitorComparison: jsonb("competitor_comparison"),
	predictedPerformance: jsonb("predicted_performance"),
	cost: numeric({ precision: 12, scale:  4 }).default('0'),
	tokensUsed: integer("tokens_used").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	metadata: jsonb(),
	batchId: varchar("batch_id"),
	status: varchar().default('pending'),
	actualCost: numeric("actual_cost", { precision: 12, scale:  4 }).default('0'),
	provider: text().default('openai'),
	costEstimate: numeric("cost_estimate", { precision: 10, scale:  2 }),
	inputTokens: integer("input_tokens").default(0),
	outputTokens: integer("output_tokens").default(0),
	result: jsonb(),
	scores: jsonb(),
	error: text(),
	progress: jsonb(),
	currentStep: integer("current_step").default(0),
	startedAt: timestamp("started_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	audioAnalysis: jsonb("audio_analysis"),
	keyframes: jsonb(),
	visualAnalysis: jsonb("visual_analysis"),
	fusedInsights: jsonb("fused_insights"),
	audioProcessingTime: integer("audio_processing_time"),
	audioCost: numeric("audio_cost", { precision: 10, scale:  4 }).default('0'),
	visualProcessingTime: integer("visual_processing_time"),
	visualCost: numeric("visual_cost", { precision: 10, scale:  4 }).default('0'),
	fusionAnalysis: jsonb("fusion_analysis"),
	copyAnalysis: jsonb("copy_analysis"),
	sceneAnalysis: jsonb("scene_analysis"),
}, (table) => [
	index("idx_creative_analyses_creative").using("btree", table.creativeId.asc().nullsLast().op("text_ops")),
	index("idx_creative_analyses_operation").using("btree", table.operationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.creativeId],
			foreignColumns: [adCreatives.id],
			name: "creative_analyses_creative_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.operationId],
			foreignColumns: [operations.id],
			name: "creative_analyses_operation_id_fkey"
		}).onDelete("cascade"),
]);

export const voiceConversations = pgTable("voice_conversations", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	callId: varchar("call_id").notNull(),
	type: text().notNull(),
	speaker: text().notNull(),
	content: text().notNull(),
	audioUrl: text("audio_url"),
	timestamp: timestamp({ mode: 'string' }).notNull(),
	duration: integer(),
	confidence: numeric({ precision: 5, scale:  4 }),
	sentiment: text(),
	emotion: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.callId],
			foreignColumns: [voiceCalls.id],
			name: "voice_conversations_call_id_fkey"
		}).onDelete("cascade"),
]);

export const voiceCalls = pgTable("voice_calls", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	operationId: varchar("operation_id").notNull(),
	twilioCallSid: text("twilio_call_sid").notNull(),
	twilioAccountSid: text("twilio_account_sid"),
	direction: text().notNull(),
	fromNumber: text("from_number").notNull(),
	toNumber: text("to_number").notNull(),
	status: text().notNull(),
	customerName: text("customer_name"),
	customerEmail: text("customer_email"),
	customerPhone: text("customer_phone"),
	duration: integer(),
	startTime: timestamp("start_time", { mode: 'string' }),
	endTime: timestamp("end_time", { mode: 'string' }),
	aiResponseGenerated: boolean("ai_response_generated").default(false),
	conversationSummary: text("conversation_summary"),
	detectedIntent: text("detected_intent"),
	satisfactionLevel: text("satisfaction_level"),
	relatedTicketId: varchar("related_ticket_id"),
	categoryId: varchar("category_id"),
	recordingUrl: text("recording_url"),
	transcription: text(),
	userAgent: text("user_agent"),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	telnyxCallControlId: text("telnyx_call_control_id"),
	telnyxCallLegId: text("telnyx_call_leg_id"),
}, (table) => [
	foreignKey({
			columns: [table.operationId],
			foreignColumns: [operations.id],
			name: "voice_calls_operation_id_fkey"
		}),
	foreignKey({
			columns: [table.relatedTicketId],
			foreignColumns: [supportTickets.id],
			name: "voice_calls_related_ticket_id_fkey"
		}),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [supportCategories.id],
			name: "voice_calls_category_id_fkey"
		}),
	unique("voice_calls_twilio_call_sid_key").on(table.twilioCallSid),
	unique("voice_calls_telnyx_call_control_id_key").on(table.telnyxCallControlId),
]);

export const voiceSettings = pgTable("voice_settings", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	operationId: varchar("operation_id").notNull(),
	isActive: boolean("is_active").default(false).notNull(),
	twilioPhoneNumber: text("twilio_phone_number"),
	welcomeMessage: text("welcome_message").default('Olá! Como posso ajudá-lo hoje?'),
	operatingHours: jsonb("operating_hours").default({"friday":{"end":"18:00","start":"09:00","enabled":true},"monday":{"end":"18:00","start":"09:00","enabled":true},"sunday":{"end":"18:00","start":"09:00","enabled":false},"tuesday":{"end":"18:00","start":"09:00","enabled":true},"saturday":{"end":"18:00","start":"09:00","enabled":false},"thursday":{"end":"18:00","start":"09:00","enabled":true},"timezone":"Europe/Madrid","wednesday":{"end":"18:00","start":"09:00","enabled":true}}),
	voiceModel: text("voice_model").default('alloy'),
	language: text().default('pt'),
	maxCallDuration: integer("max_call_duration").default(600),
	fallbackToHuman: boolean("fallback_to_human").default(true),
	humanFallbackNumber: text("human_fallback_number"),
	outOfHoursMessage: text("out_of_hours_message").default('Nosso horário de atendimento é de segunda a sexta, das 9h às 18h. Deixe sua mensagem que retornaremos em breve.'),
	outOfHoursAction: text("out_of_hours_action").default('voicemail'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	telnyxPhoneNumber: text("telnyx_phone_number"),
}, (table) => [
	foreignKey({
			columns: [table.operationId],
			foreignColumns: [operations.id],
			name: "voice_settings_operation_id_fkey"
		}).onDelete("cascade"),
]);

export const adCreatives = pgTable("ad_creatives", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	creativeId: varchar("creative_id").notNull(),
	operationId: varchar("operation_id").notNull(),
	accountId: varchar("account_id").notNull(),
	campaignId: varchar("campaign_id"),
	name: varchar(),
	type: varchar(),
	status: varchar(),
	title: varchar(),
	body: text(),
	imageUrl: text("image_url"),
	videoUrl: text("video_url"),
	thumbnailUrl: text("thumbnail_url"),
	callToAction: varchar("call_to_action"),
	linkUrl: text("link_url"),
	impressions: integer().default(0),
	clicks: integer().default(0),
	conversions: integer().default(0),
	spend: numeric({ precision: 12, scale:  2 }).default('0'),
	ctr: numeric({ precision: 5, scale:  2 }).default('0'),
	cpc: numeric({ precision: 12, scale:  2 }).default('0'),
	cpm: numeric({ precision: 12, scale:  2 }).default('0'),
	roas: numeric({ precision: 5, scale:  2 }).default('0'),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	isAnalyzed: boolean("is_analyzed").default(false),
	lastAnalyzedAt: timestamp("last_analyzed_at", { mode: 'string' }),
	metadata: jsonb(),
	network: varchar().default('facebook'),
	batchId: varchar("batch_id"),
	adId: varchar("ad_id"),
	headline: varchar(),
	primaryText: text("primary_text"),
	description: text(),
	ctaType: varchar("cta_type", { length: 100 }),
	period: varchar({ length: 50 }),
	conversionRate: numeric("conversion_rate", { precision: 10, scale:  4 }),
	lastSync: timestamp("last_sync", { mode: 'string' }),
	providerData: jsonb("provider_data"),
	isNew: boolean("is_new").default(true),
	metaInsightsData: jsonb("meta_insights_data"),
	performancePredictions: jsonb("performance_predictions"),
	benchmarkData: jsonb("benchmark_data"),
}, (table) => [
	index("idx_ad_creatives_account").using("btree", table.accountId.asc().nullsLast().op("text_ops")),
	index("idx_ad_creatives_campaign").using("btree", table.campaignId.asc().nullsLast().op("text_ops")),
	index("idx_ad_creatives_operation").using("btree", table.operationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.operationId],
			foreignColumns: [operations.id],
			name: "ad_creatives_operation_id_fkey"
		}).onDelete("cascade"),
	unique("ad_creatives_creative_id_key").on(table.creativeId),
]);

export const creativeBenchmarks = pgTable("creative_benchmarks", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	industry: varchar({ length: 100 }).notNull(),
	creativeType: varchar("creative_type", { length: 50 }).notNull(),
	countryCodes: text("country_codes").array().default([""]).notNull(),
	avgCtr: numeric("avg_ctr", { precision: 8, scale:  4 }).default('0').notNull(),
	avgCpc: numeric("avg_cpc", { precision: 10, scale:  2 }).default('0').notNull(),
	avgCpm: numeric("avg_cpm", { precision: 10, scale:  2 }).default('0').notNull(),
	avgRoas: numeric("avg_roas", { precision: 10, scale:  2 }).default('0').notNull(),
	percentile25: jsonb("percentile_25"),
	percentile50: jsonb("percentile_50"),
	percentile75: jsonb("percentile_75"),
	percentile90: jsonb("percentile_90"),
	sampleSize: integer("sample_size").notNull(),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).notNull(),
	confidenceScore: numeric("confidence_score", { precision: 5, scale:  2 }).default('0').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_creative_benchmarks_industry_type").using("btree", table.industry.asc().nullsLast().op("text_ops"), table.creativeType.asc().nullsLast().op("text_ops")),
	index("idx_creative_benchmarks_last_updated").using("btree", table.lastUpdated.asc().nullsLast().op("timestamp_ops")),
]);

export const creativeEditPlans = pgTable("creative_edit_plans", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	creativeId: varchar("creative_id").notNull(),
	analysisId: varchar("analysis_id").notNull(),
	planName: varchar("plan_name", { length: 255 }).notNull(),
	planDescription: text("plan_description"),
	priorityLevel: varchar("priority_level", { length: 20 }).default('medium').notNull(),
	estimatedImpact: jsonb("estimated_impact"),
	visualActions: jsonb("visual_actions"),
	audioActions: jsonb("audio_actions"),
	copyActions: jsonb("copy_actions"),
	targetingActions: jsonb("targeting_actions"),
	implementationSteps: jsonb("implementation_steps"),
	successMetrics: jsonb("success_metrics"),
	status: text().default('pending').notNull(),
	implementedAt: timestamp("implemented_at", { mode: 'string' }),
	resultsValidatedAt: timestamp("results_validated_at", { mode: 'string' }),
	actualResults: jsonb("actual_results"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_creative_edit_plans_analysis").using("btree", table.analysisId.asc().nullsLast().op("text_ops")),
	index("idx_creative_edit_plans_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_creative_edit_plans_creative").using("btree", table.creativeId.asc().nullsLast().op("text_ops")),
	index("idx_creative_edit_plans_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.creativeId],
			foreignColumns: [adCreatives.id],
			name: "creative_edit_plans_creative_id_fkey"
		}),
	foreignKey({
			columns: [table.analysisId],
			foreignColumns: [creativeAnalyses.id],
			name: "creative_edit_plans_analysis_id_fkey"
		}),
]);

export const creativeVariations = pgTable("creative_variations", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	originalCreativeId: varchar("original_creative_id").notNull(),
	variationCreativeId: varchar("variation_creative_id").notNull(),
	parentVariationId: varchar("parent_variation_id"),
	editPlanId: varchar("edit_plan_id"),
	variationType: varchar("variation_type", { length: 50 }).notNull(),
	changeDescription: text("change_description"),
	generationMethod: varchar("generation_method", { length: 50 }).default('manual').notNull(),
	generationCost: numeric("generation_cost", { precision: 10, scale:  2 }).default('0'),
	generationProvider: varchar("generation_provider", { length: 100 }),
	generationPrompts: jsonb("generation_prompts"),
	generationParameters: jsonb("generation_parameters"),
	assetUrls: jsonb("asset_urls"),
	assetMetadata: jsonb("asset_metadata"),
	testStatus: varchar("test_status", { length: 20 }).default('pending').notNull(),
	testStartDate: timestamp("test_start_date", { mode: 'string' }),
	testEndDate: timestamp("test_end_date", { mode: 'string' }),
	testResults: jsonb("test_results"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_creative_variations_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_creative_variations_edit_plan").using("btree", table.editPlanId.asc().nullsLast().op("text_ops")),
	index("idx_creative_variations_original").using("btree", table.originalCreativeId.asc().nullsLast().op("text_ops")),
	index("idx_creative_variations_test_status").using("btree", table.testStatus.asc().nullsLast().op("text_ops")),
	index("idx_creative_variations_variation").using("btree", table.variationCreativeId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.originalCreativeId],
			foreignColumns: [adCreatives.id],
			name: "creative_variations_original_creative_id_fkey"
		}),
	foreignKey({
			columns: [table.variationCreativeId],
			foreignColumns: [adCreatives.id],
			name: "creative_variations_variation_creative_id_fkey"
		}),
	foreignKey({
			columns: [table.parentVariationId],
			foreignColumns: [table.id],
			name: "creative_variations_parent_variation_id_fkey"
		}),
	foreignKey({
			columns: [table.editPlanId],
			foreignColumns: [creativeEditPlans.id],
			name: "creative_variations_edit_plan_id_fkey"
		}),
]);

export const funnelIntegrations = pgTable("funnel_integrations", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	operationId: varchar("operation_id").notNull(),
	storeId: varchar("store_id"),
	vercelAccessToken: text("vercel_access_token"),
	vercelRefreshToken: text("vercel_refresh_token"),
	vercelTeamId: varchar("vercel_team_id"),
	vercelUserId: varchar("vercel_user_id"),
	connectedAt: timestamp("connected_at", { mode: 'string' }).defaultNow(),
	lastUsed: timestamp("last_used", { mode: 'string' }),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const productOperationLinks = pgTable("product_operation_links", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	operationId: varchar("operation_id").notNull(),
	storeId: varchar("store_id").notNull(),
	marketplaceProductId: varchar("marketplace_product_id").notNull(),
	sellingPrice: numeric("selling_price", { precision: 10, scale:  2 }).notNull(),
	currency: text().default('EUR').notNull(),
	sku: text(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.operationId],
			foreignColumns: [operations.id],
			name: "product_operation_links_operation_id_fkey"
		}),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "product_operation_links_store_id_fkey"
		}),
	foreignKey({
			columns: [table.marketplaceProductId],
			foreignColumns: [marketplaceProducts.id],
			name: "product_operation_links_marketplace_product_id_fkey"
		}),
]);

export const marketplaceProducts = pgTable("marketplace_products", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	baseCost: numeric("base_cost", { precision: 10, scale:  2 }).notNull(),
	currency: text().default('EUR').notNull(),
	images: jsonb().default([]),
	category: text().notNull(),
	tags: text().array(),
	supplier: text().notNull(),
	status: text().default('active').notNull(),
	specs: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const announcements = pgTable("announcements", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	title: text().notNull(),
	content: text().notNull(),
	type: text().default('update').notNull(),
	publishedAt: timestamp("published_at", { mode: 'string' }).defaultNow(),
	isPinned: boolean("is_pinned").default(false),
	audience: text().default('all').notNull(),
	roleTarget: text("role_target"),
	operationId: varchar("operation_id"),
	ctaLabel: text("cta_label"),
	ctaUrl: text("cta_url"),
	status: text().default('published').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	imageUrl: text("image_url"),
	description: text().default(').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.operationId],
			foreignColumns: [operations.id],
			name: "announcements_operation_id_fkey"
		}),
]);

export const funnelDeployments = pgTable("funnel_deployments", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	funnelId: varchar("funnel_id").notNull(),
	vercelProjectId: varchar("vercel_project_id"),
	vercelDeploymentId: varchar("vercel_deployment_id"),
	deploymentUrl: text("deployment_url"),
	customDomain: varchar("custom_domain"),
	status: varchar().default('pending').notNull(),
	buildLogs: text("build_logs"),
	deployedAt: timestamp("deployed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const funnelTemplates = pgTable("funnel_templates", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: varchar().notNull(),
	description: text(),
	category: varchar().notNull(),
	previewImage: text("preview_image"),
	templateConfig: jsonb("template_config").notNull(),
	isActive: boolean("is_active").default(true),
	sortOrder: integer("sort_order").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	aiPrompts: jsonb("ai_prompts"),
});

export const funnelAnalytics = pgTable("funnel_analytics", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	funnelId: varchar("funnel_id").notNull(),
	date: date().notNull(),
	views: integer().default(0),
	clicks: integer().default(0),
	conversions: integer().default(0),
	revenue: numeric({ precision: 10, scale:  2 }).default('0'),
	bounceRate: numeric("bounce_rate", { precision: 5, scale:  2 }),
	conversionRate: numeric("conversion_rate", { precision: 5, scale:  2 }),
	avgTimeOnPage: integer("avg_time_on_page"),
	trafficSources: jsonb("traffic_sources"),
	deviceStats: jsonb("device_stats"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const pageGenerationTemplates = pgTable("page_generation_templates", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: varchar().notNull(),
	type: varchar().notNull(),
	industry: varchar().notNull(),
	language: varchar().default('pt-BR'),
	templateData: jsonb("template_data").notNull(),
	conversionFramework: varchar("conversion_framework").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const funnels = pgTable("funnels", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	operationId: varchar("operation_id").notNull(),
	storeId: varchar("store_id"),
	name: varchar().notNull(),
	description: text(),
	templateId: varchar("template_id"),
	status: varchar().default('draft').notNull(),
	isActive: boolean("is_active").default(true),
	productInfo: jsonb("product_info"),
	trackingConfig: jsonb("tracking_config"),
	generatedContent: jsonb("generated_content"),
	aiCost: numeric("ai_cost", { precision: 10, scale:  4 }).default('0'),
	generatedAt: timestamp("generated_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	type: text().default('ecommerce').notNull(),
	language: text().default('pt-BR').notNull(),
	currency: text().default('EUR').notNull(),
	lastRegeneratedAt: timestamp("last_regenerated_at", { mode: 'string' }),
});

export const funnelPages = pgTable("funnel_pages", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	funnelId: varchar("funnel_id").notNull(),
	name: text().notNull(),
	pageType: text("page_type").notNull(),
	path: text().notNull(),
	model: jsonb().notNull(),
	templateId: varchar("template_id"),
	status: text().default('draft').notNull(),
	version: integer().default(1).notNull(),
	isActive: boolean("is_active").default(true),
	lastEditedBy: varchar("last_edited_by"),
	lastAiPrompt: text("last_ai_prompt"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.funnelId],
			foreignColumns: [funnels.id],
			name: "funnel_pages_funnel_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [funnelPageTemplates.id],
			name: "funnel_pages_template_id_fkey"
		}),
	foreignKey({
			columns: [table.lastEditedBy],
			foreignColumns: [users.id],
			name: "funnel_pages_last_edited_by_fkey"
		}),
]);

export const funnelPageTemplates = pgTable("funnel_page_templates", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	pageType: text("page_type").notNull(),
	category: text().default('standard').notNull(),
	defaultModel: jsonb("default_model").notNull(),
	allowedSections: jsonb("allowed_sections").default([]),
	requiredSections: jsonb("required_sections").default([]),
	previewImageUrl: text("preview_image_url"),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const funnelPageRevisions = pgTable("funnel_page_revisions", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	pageId: varchar("page_id").notNull(),
	version: integer().notNull(),
	changeType: text("change_type").notNull(),
	model: jsonb().notNull(),
	diff: jsonb(),
	aiPrompt: text("ai_prompt"),
	changeDescription: text("change_description"),
	createdBy: varchar("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.pageId],
			foreignColumns: [funnelPages.id],
			name: "funnel_page_revisions_page_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "funnel_page_revisions_created_by_fkey"
		}),
]);

export const cartpandaIntegrations = pgTable("cartpanda_integrations", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	operationId: varchar("operation_id").notNull(),
	storeSlug: text("store_slug").notNull(),
	bearerToken: text("bearer_token").notNull(),
	status: text().default('pending').notNull(),
	lastSyncAt: timestamp("last_sync_at", { mode: 'string' }),
	syncErrors: text("sync_errors"),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.operationId],
			foreignColumns: [operations.id],
			name: "cartpanda_integrations_operation_id_fkey"
		}),
]);

export const pageGenerationReviews = pgTable("page_generation_reviews", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	draftId: varchar("draft_id").notNull(),
	reviewerId: varchar("reviewer_id").notNull(),
	reviewScore: jsonb("review_score").notNull(),
	suggestions: jsonb(),
	approved: boolean().default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const pageQualityScores = pgTable("page_quality_scores", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	draftId: varchar("draft_id").notNull(),
	contentScore: numeric("content_score", { precision: 3, scale:  1 }).notNull(),
	designScore: numeric("design_score", { precision: 3, scale:  1 }).notNull(),
	conversionScore: numeric("conversion_score", { precision: 3, scale:  1 }).notNull(),
	mobileScore: numeric("mobile_score", { precision: 3, scale:  1 }).notNull(),
	seoScore: numeric("seo_score", { precision: 3, scale:  1 }).notNull(),
	overallScore: numeric("overall_score", { precision: 3, scale:  1 }).notNull(),
	calculatedAt: timestamp("calculated_at", { mode: 'string' }).defaultNow(),
});

export const pageGenerationDrafts = pgTable("page_generation_drafts", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	funnelId: varchar("funnel_id").notNull(),
	pageId: varchar("page_id"),
	operationId: varchar("operation_id").notNull(),
	userId: varchar("user_id").notNull(),
	briefData: jsonb("brief_data").notNull(),
	enrichedBrief: jsonb("enriched_brief"),
	generatedContent: jsonb("generated_content"),
	layoutOptimization: jsonb("layout_optimization"),
	mediaEnrichment: jsonb("media_enrichment"),
	qaReview: jsonb("qa_review"),
	finalModel: jsonb("final_model"),
	cost: numeric({ precision: 10, scale:  4 }).default('0'),
	status: varchar().default('pending').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	templateId: varchar("template_id"),
	generationSteps: jsonb("generation_steps"),
	qualityScore: jsonb("quality_score"),
	generatedModel: jsonb("generated_model"),
	aiCost: numeric("ai_cost", { precision: 10, scale:  4 }).default('0'),
	generatedAt: timestamp("generated_at", { mode: 'string' }).defaultNow(),
	reviewedAt: timestamp("reviewed_at", { mode: 'string' }),
	publishedAt: timestamp("published_at", { mode: 'string' }),
});

export const adminSupportDirectives = pgTable("admin_support_directives", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	type: varchar({ length: 50 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	content: text().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	sortOrder: integer("sort_order").default(0),
});

export const reimbursementRequests = pgTable("reimbursement_requests", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	ticketId: varchar("ticket_id").notNull(),
	customerEmail: text("customer_email").notNull(),
	customerName: text("customer_name").notNull(),
	customerPhone: text("customer_phone"),
	orderNumber: text("order_number"),
	productName: text("product_name"),
	refundAmount: numeric("refund_amount", { precision: 10, scale:  2 }),
	currency: text().default('EUR'),
	bankAccountNumber: text("bank_account_number"),
	bankAccountHolder: text("bank_account_holder"),
	bankName: text("bank_name"),
	pixKey: text("pix_key"),
	refundReason: text("refund_reason").notNull(),
	additionalDetails: text("additional_details"),
	status: text().default('pending').notNull(),
	reviewNotes: text("review_notes"),
	reviewedByUserId: varchar("reviewed_by_user_id"),
	reviewedAt: timestamp("reviewed_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	rejectionReason: text("rejection_reason"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.ticketId],
			foreignColumns: [supportTickets.id],
			name: "reimbursement_requests_ticket_id_fkey"
		}),
	foreignKey({
			columns: [table.reviewedByUserId],
			foreignColumns: [users.id],
			name: "reimbursement_requests_reviewed_by_user_id_fkey"
		}),
]);

export const affiliateMemberships = pgTable("affiliate_memberships", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	affiliateId: varchar("affiliate_id").notNull(),
	operationId: varchar("operation_id").notNull(),
	productId: varchar("product_id"),
	status: text().default('active').notNull(),
	approvedByUserId: varchar("approved_by_user_id"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	customCommissionPercent: numeric("custom_commission_percent", { precision: 5, scale:  2 }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	shortCode: varchar("short_code", { length: 12 }),
}, (table) => [
	index("affiliate_memberships_affiliate_id_idx").using("btree", table.affiliateId.asc().nullsLast().op("text_ops")),
	index("affiliate_memberships_operation_id_idx").using("btree", table.operationId.asc().nullsLast().op("text_ops")),
	index("affiliate_memberships_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("short_code_idx").using("btree", table.shortCode.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.affiliateId],
			foreignColumns: [affiliateProfiles.id],
			name: "affiliate_memberships_affiliate_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.operationId],
			foreignColumns: [operations.id],
			name: "affiliate_memberships_operation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "affiliate_memberships_product_id_fkey"
		}),
	foreignKey({
			columns: [table.approvedByUserId],
			foreignColumns: [users.id],
			name: "affiliate_memberships_approved_by_user_id_fkey"
		}),
	unique("affiliate_memberships_short_code_key").on(table.shortCode),
]);

export const affiliateCommissionRules = pgTable("affiliate_commission_rules", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	operationId: varchar("operation_id").notNull(),
	productId: varchar("product_id"),
	commissionPercent: numeric("commission_percent", { precision: 5, scale:  2 }).notNull(),
	commissionType: text("commission_type").default('percentage').notNull(),
	fixedAmount: numeric("fixed_amount", { precision: 10, scale:  2 }),
	bonusRules: jsonb("bonus_rules"),
	validFrom: timestamp("valid_from", { mode: 'string' }).defaultNow(),
	validUntil: timestamp("valid_until", { mode: 'string' }),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("affiliate_commission_rules_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("affiliate_commission_rules_operation_id_idx").using("btree", table.operationId.asc().nullsLast().op("text_ops")),
	index("affiliate_commission_rules_product_id_idx").using("btree", table.productId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.operationId],
			foreignColumns: [operations.id],
			name: "affiliate_commission_rules_operation_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "affiliate_commission_rules_product_id_fkey"
		}),
]);

export const affiliatePayouts = pgTable("affiliate_payouts", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	affiliateId: varchar("affiliate_id").notNull(),
	periodStart: timestamp("period_start", { mode: 'string' }).notNull(),
	periodEnd: timestamp("period_end", { mode: 'string' }).notNull(),
	totalAmount: numeric("total_amount", { precision: 10, scale:  2 }).notNull(),
	currency: text().default('EUR').notNull(),
	conversionsCount: integer("conversions_count").default(0).notNull(),
	paymentMethod: text("payment_method"),
	paymentReference: text("payment_reference"),
	paymentProof: text("payment_proof"),
	status: text().default('pending').notNull(),
	paidByUserId: varchar("paid_by_user_id"),
	paidAt: timestamp("paid_at", { mode: 'string' }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("affiliate_payouts_affiliate_id_idx").using("btree", table.affiliateId.asc().nullsLast().op("text_ops")),
	index("affiliate_payouts_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.affiliateId],
			foreignColumns: [affiliateProfiles.id],
			name: "affiliate_payouts_affiliate_id_fkey"
		}),
	foreignKey({
			columns: [table.paidByUserId],
			foreignColumns: [users.id],
			name: "affiliate_payouts_paid_by_user_id_fkey"
		}),
]);

export const affiliateConversions = pgTable("affiliate_conversions", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	affiliateId: varchar("affiliate_id").notNull(),
	orderId: text("order_id").notNull(),
	trackingId: text("tracking_id").notNull(),
	orderTotal: numeric("order_total", { precision: 10, scale:  2 }).notNull(),
	commissionAmount: numeric("commission_amount", { precision: 10, scale:  2 }).notNull(),
	commissionPercent: numeric("commission_percent", { precision: 5, scale:  2 }),
	currency: text().default('EUR').notNull(),
	status: text().default('pending').notNull(),
	approvedByUserId: varchar("approved_by_user_id"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	rejectionReason: text("rejection_reason"),
	payoutId: varchar("payout_id"),
	conversionSource: text("conversion_source"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("affiliate_conversions_affiliate_id_idx").using("btree", table.affiliateId.asc().nullsLast().op("text_ops")),
	index("affiliate_conversions_order_id_idx").using("btree", table.orderId.asc().nullsLast().op("text_ops")),
	index("affiliate_conversions_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("affiliate_conversions_tracking_id_idx").using("btree", table.trackingId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.affiliateId],
			foreignColumns: [affiliateProfiles.id],
			name: "affiliate_conversions_affiliate_id_fkey"
		}),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "affiliate_conversions_order_id_fkey"
		}),
	foreignKey({
			columns: [table.approvedByUserId],
			foreignColumns: [users.id],
			name: "affiliate_conversions_approved_by_user_id_fkey"
		}),
	foreignKey({
			columns: [table.payoutId],
			foreignColumns: [affiliatePayouts.id],
			name: "affiliate_conversions_payout_id_fkey"
		}),
]);

export const affiliateClicks = pgTable("affiliate_clicks", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	trackingId: text("tracking_id").notNull(),
	affiliateId: varchar("affiliate_id").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	referer: text(),
	landingPage: text("landing_page"),
	country: text(),
	city: text(),
	converted: boolean().default(false).notNull(),
	conversionId: varchar("conversion_id"),
	convertedAt: timestamp("converted_at", { mode: 'string' }),
	clickedAt: timestamp("clicked_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("affiliate_clicks_affiliate_id_idx").using("btree", table.affiliateId.asc().nullsLast().op("text_ops")),
	index("affiliate_clicks_converted_idx").using("btree", table.converted.asc().nullsLast().op("bool_ops")),
	index("affiliate_clicks_tracking_id_idx").using("btree", table.trackingId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.affiliateId],
			foreignColumns: [affiliateProfiles.id],
			name: "affiliate_clicks_affiliate_id_fkey"
		}),
	foreignKey({
			columns: [table.conversionId],
			foreignColumns: [affiliateConversions.id],
			name: "affiliate_clicks_conversion_id_fkey"
		}),
]);

export const vercelDeploymentConfig = pgTable("vercel_deployment_config", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	operationId: varchar("operation_id").notNull(),
	teamId: text("team_id").notNull(),
	projectId: text("project_id"),
	apiToken: text("api_token").notNull(),
	domain: text(),
	allowedDomains: text("allowed_domains").array(),
	framework: text().default('nextjs'),
	buildCommand: text("build_command"),
	outputDirectory: text("output_directory"),
	isActive: boolean("is_active").default(true).notNull(),
	lastDeploymentAt: timestamp("last_deployment_at", { mode: 'string' }),
	lastDeploymentStatus: text("last_deployment_status"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("vercel_deployment_config_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("vercel_deployment_config_operation_id_idx").using("btree", table.operationId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.operationId],
			foreignColumns: [operations.id],
			name: "vercel_deployment_config_operation_id_fkey"
		}).onDelete("cascade"),
]);

export const affiliateProfiles = pgTable("affiliate_profiles", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	storeId: varchar("store_id").notNull(),
	fiscalName: text("fiscal_name"),
	fiscalId: text("fiscal_id"),
	fiscalAddress: text("fiscal_address"),
	fiscalCountry: text("fiscal_country"),
	bankAccountHolder: text("bank_account_holder"),
	bankIban: text("bank_iban"),
	pixKey: text("pix_key"),
	status: text().default('pending').notNull(),
	approvedByUserId: varchar("approved_by_user_id"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	suspendedReason: text("suspended_reason"),
	referralCode: text("referral_code"),
	bio: text(),
	socialMedia: jsonb("social_media"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	trackingPixel: text("tracking_pixel"),
	landingPageUrl: text("landing_page_url"),
	landingPageId: varchar("landing_page_id"),
}, (table) => [
	index("affiliate_profiles_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("affiliate_profiles_store_id_idx").using("btree", table.storeId.asc().nullsLast().op("text_ops")),
	index("affiliate_profiles_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "affiliate_profiles_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.storeId],
			foreignColumns: [stores.id],
			name: "affiliate_profiles_store_id_fkey"
		}),
	foreignKey({
			columns: [table.approvedByUserId],
			foreignColumns: [users.id],
			name: "affiliate_profiles_approved_by_user_id_fkey"
		}),
	unique("affiliate_profiles_user_id_key").on(table.userId),
	unique("affiliate_profiles_referral_code_key").on(table.referralCode),
]);

export const affiliateLandingPageProducts = pgTable("affiliate_landing_page_products", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	landingPageId: varchar("landing_page_id").notNull(),
	productId: varchar("product_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_affiliate_landing_page_products_landing_page_id").using("btree", table.landingPageId.asc().nullsLast().op("text_ops")),
	index("idx_affiliate_landing_page_products_product_id").using("btree", table.productId.asc().nullsLast().op("text_ops")),
	index("idx_affiliate_landing_page_products_unique").using("btree", table.landingPageId.asc().nullsLast().op("text_ops"), table.productId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.landingPageId],
			foreignColumns: [affiliateLandingPages.id],
			name: "affiliate_landing_page_products_landing_page_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "affiliate_landing_page_products_product_id_fkey"
		}).onDelete("cascade"),
]);

export const affiliateLandingPages = pgTable("affiliate_landing_pages", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	htmlContent: text("html_content").notNull(),
	cssContent: text("css_content"),
	jsContent: text("js_content"),
	thumbnailUrl: text("thumbnail_url"),
	tags: text().array(),
	status: text().default('draft').notNull(),
	vercelProjectId: text("vercel_project_id"),
	vercelDeploymentUrl: text("vercel_deployment_url"),
	lastDeployedAt: timestamp("last_deployed_at", { mode: 'string' }),
	createdByUserId: varchar("created_by_user_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	model: jsonb(),
}, (table) => [
	index("affiliate_landing_pages_created_by_idx").using("btree", table.createdByUserId.asc().nullsLast().op("text_ops")),
	index("affiliate_landing_pages_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdByUserId],
			foreignColumns: [users.id],
			name: "affiliate_landing_pages_created_by_user_id_fkey"
		}),
]);

export const affiliateProductPixels = pgTable("affiliate_product_pixels", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	affiliateId: varchar("affiliate_id").notNull(),
	productId: varchar("product_id").notNull(),
	landingPageId: varchar("landing_page_id"),
	pixelType: text("pixel_type").notNull(),
	pixelId: text("pixel_id").notNull(),
	accessToken: text("access_token"),
	events: jsonb().default({"pageView":true,"purchase":true}).notNull(),
	customCode: text("custom_code"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_affiliate_product_pixels_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("idx_affiliate_product_pixels_affiliate").using("btree", table.affiliateId.asc().nullsLast().op("text_ops")),
	index("idx_affiliate_product_pixels_landing_page").using("btree", table.landingPageId.asc().nullsLast().op("text_ops")),
	index("idx_affiliate_product_pixels_product").using("btree", table.productId.asc().nullsLast().op("text_ops")),
	index("idx_affiliate_product_pixels_unique").using("btree", table.affiliateId.asc().nullsLast().op("text_ops"), table.productId.asc().nullsLast().op("text_ops"), table.landingPageId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.affiliateId],
			foreignColumns: [affiliateProfiles.id],
			name: "affiliate_product_pixels_affiliate_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "affiliate_product_pixels_product_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.landingPageId],
			foreignColumns: [affiliateLandingPages.id],
			name: "affiliate_product_pixels_landing_page_id_fkey"
		}).onDelete("cascade"),
]);

export const webhookLogs = pgTable("webhook_logs", {
	id: varchar().default((gen_random_uuid())).primaryKey().notNull(),
	integrationConfigId: varchar("integration_config_id").notNull(),
	payload: jsonb().notNull(),
	responseStatus: integer("response_status"),
	responseBody: text("response_body"),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	orderId: text("order_id"),
}, (table) => [
	foreignKey({
			columns: [table.integrationConfigId],
			foreignColumns: [integrationConfigs.id],
			name: "webhook_logs_config_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "webhook_logs_order_id_fkey"
		}),
]);

export const integrationConfigs = pgTable("integration_configs", {
	id: varchar().default((gen_random_uuid())).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	integrationType: varchar("integration_type").notNull(),
	webhookUrl: text("webhook_url"),
	webhookSecret: text("webhook_secret"),
	isActive: boolean("is_active").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	operationId: varchar("operation_id"),
}, (table) => [
	foreignKey({
			columns: [table.operationId],
			foreignColumns: [operations.id],
			name: "integration_configs_operation_id_fkey"
		}),
	unique("unique_user_operation_type").on(table.userId, table.integrationType, table.operationId),
]);

export const googleAdsIntegrations = pgTable("google_ads_integrations", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	operationId: varchar("operation_id").notNull(),
	customerId: text("customer_id").notNull(),
	accountName: text("account_name"),
	refreshToken: text("refresh_token").notNull(),
	selectedCampaignIds: text("selected_campaign_ids").array().default([""]),
	status: text().default('active').notNull(),
	lastSyncAt: timestamp("last_sync_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.operationId],
			foreignColumns: [operations.id],
			name: "google_ads_integrations_operation_id_fkey"
		}),
]);

export const analyticsSessions = pgTable("analytics_sessions", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	sessionId: varchar("session_id").notNull(),
	userAgent: text("user_agent"),
	ipAddress: varchar("ip_address"),
	referrer: text(),
	landingPage: text("landing_page"),
	utmSource: text("utm_source"),
	utmMedium: text("utm_medium"),
	utmCampaign: text("utm_campaign"),
	utmTerm: text("utm_term"),
	utmContent: text("utm_content"),
	deviceType: text("device_type"),
	browser: text(),
	os: text(),
	country: text(),
	city: text(),
	pageViews: integer("page_views").default(0),
	events: jsonb(),
	firstSeenAt: timestamp("first_seen_at", { mode: 'string' }).defaultNow(),
	lastSeenAt: timestamp("last_seen_at", { mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_analytics_sessions_session_id").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	unique("analytics_sessions_session_id_key").on(table.sessionId),
]);

export const fhbSyncLogs = pgTable("fhb_sync_logs", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	fhbAccountId: varchar("fhb_account_id").notNull(),
	syncType: text("sync_type").notNull(),
	status: text().notNull(),
	ordersProcessed: integer("orders_processed").default(0),
	ordersCreated: integer("orders_created").default(0),
	ordersUpdated: integer("orders_updated").default(0),
	ordersSkipped: integer("orders_skipped").default(0),
	durationMs: integer("duration_ms"),
	errorMessage: text("error_message"),
	startedAt: timestamp("started_at", { mode: 'string' }).notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.fhbAccountId],
			foreignColumns: [fhbAccounts.id],
			name: "fhb_sync_logs_fhb_account_id_fkey"
		}),
]);

export const fhbAccounts = pgTable("fhb_accounts", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	appId: text("app_id").notNull(),
	secret: text().notNull(),
	apiUrl: text("api_url").default('https://api.fhb.sk/v3').notNull(),
	status: text().default('active').notNull(),
	lastTestedAt: timestamp("last_tested_at", { mode: 'string' }),
	testResult: text("test_result"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	initialSyncCompleted: boolean("initial_sync_completed").default(false).notNull(),
	initialSyncCompletedAt: timestamp("initial_sync_completed_at", { mode: 'string' }),
});

export const fhbOrders = pgTable("fhb_orders", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	fhbAccountId: varchar("fhb_account_id"),
	fhbOrderId: text("fhb_order_id").notNull(),
	variableSymbol: text("variable_symbol").notNull(),
	status: text().notNull(),
	tracking: text(),
	value: numeric({ precision: 10, scale:  2 }),
	recipient: jsonb(),
	items: jsonb(),
	rawData: jsonb("raw_data").notNull(),
	processedToOrders: boolean("processed_to_orders").default(false).notNull(),
	processedAt: timestamp("processed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("fhb_orders_unprocessed_idx").using("btree", table.processedToOrders.asc().nullsLast().op("bool_ops")),
	index("fhb_orders_variable_symbol_idx").using("btree", table.variableSymbol.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.fhbAccountId],
			foreignColumns: [fhbAccounts.id],
			name: "fhb_orders_fhb_account_id_fkey"
		}),
	unique("unique_fhb_order").on(table.fhbAccountId, table.fhbOrderId),
]);
