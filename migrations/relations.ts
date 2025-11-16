import { relations } from "drizzle-orm/relations";
import { stores, orders, operations, users, dashboardMetrics, products, adAccounts, shippingProviders, syncJobs, facebookAdsIntegrations, userOperationAccess, fulfillmentIntegrations, fhbAccounts, orderStatusHistory, shopifyIntegrations, investorProfiles, userProducts, productContracts, supplierPayments, supplierPaymentItems, investments, investmentPools, investmentTransactions, poolPerformanceHistory, investmentTaxCalculations, paymentReceipts, taxPaymentSchedule, manualAdSpend, supportCategories, supportResponses, supportTickets, supportConversations, supportMetrics, supportEmails, customerSupportMessages, aiDirectives, adCreatives, creativeAnalyses, voiceCalls, voiceConversations, voiceSettings, creativeEditPlans, creativeVariations, productOperationLinks, marketplaceProducts, announcements, funnels, funnelPages, funnelPageTemplates, funnelPageRevisions, cartpandaIntegrations, reimbursementRequests, affiliateProfiles, affiliateMemberships, affiliateCommissionRules, affiliatePayouts, affiliateConversions, affiliateClicks, vercelDeploymentConfig, affiliateLandingPages, affiliateLandingPageProducts, affiliateProductPixels, integrationConfigs, webhookLogs, googleAdsIntegrations, fhbSyncLogs, fhbOrders } from "./schema";

export const ordersRelations = relations(orders, ({one, many}) => ({
	store: one(stores, {
		fields: [orders.storeId],
		references: [stores.id]
	}),
	operation: one(operations, {
		fields: [orders.operationId],
		references: [operations.id]
	}),
	user: one(users, {
		fields: [orders.affiliateId],
		references: [users.id]
	}),
	orderStatusHistories: many(orderStatusHistory),
	supplierPaymentItems: many(supplierPaymentItems),
	supportTickets: many(supportTickets),
	affiliateConversions: many(affiliateConversions),
	webhookLogs: many(webhookLogs),
}));

export const storesRelations = relations(stores, ({many}) => ({
	orders: many(orders),
	dashboardMetrics: many(dashboardMetrics),
	products: many(products),
	adAccounts: many(adAccounts),
	shippingProviders: many(shippingProviders),
	syncJobs: many(syncJobs),
	operations: many(operations),
	userProducts: many(userProducts),
	supplierPayments: many(supplierPayments),
	productOperationLinks: many(productOperationLinks),
	affiliateProfiles: many(affiliateProfiles),
}));

export const operationsRelations = relations(operations, ({one, many}) => ({
	orders: many(orders),
	dashboardMetrics: many(dashboardMetrics),
	products: many(products),
	adAccounts: many(adAccounts),
	shippingProviders: many(shippingProviders),
	syncJobs: many(syncJobs),
	facebookAdsIntegrations: many(facebookAdsIntegrations),
	userOperationAccesses: many(userOperationAccess),
	store: one(stores, {
		fields: [operations.storeId],
		references: [stores.id]
	}),
	user: one(users, {
		fields: [operations.ownerId],
		references: [users.id]
	}),
	fulfillmentIntegrations: many(fulfillmentIntegrations),
	shopifyIntegrations: many(shopifyIntegrations),
	manualAdSpends: many(manualAdSpend),
	aiDirectives: many(aiDirectives),
	creativeAnalyses: many(creativeAnalyses),
	voiceCalls: many(voiceCalls),
	voiceSettings: many(voiceSettings),
	adCreatives: many(adCreatives),
	productOperationLinks: many(productOperationLinks),
	announcements: many(announcements),
	cartpandaIntegrations: many(cartpandaIntegrations),
	affiliateMemberships: many(affiliateMemberships),
	affiliateCommissionRules: many(affiliateCommissionRules),
	vercelDeploymentConfigs: many(vercelDeploymentConfig),
	integrationConfigs: many(integrationConfigs),
	googleAdsIntegrations: many(googleAdsIntegrations),
}));

export const usersRelations = relations(users, ({many}) => ({
	orders: many(orders),
	products: many(products),
	userOperationAccesses: many(userOperationAccess),
	operations: many(operations),
	investorProfiles: many(investorProfiles),
	userProducts: many(userProducts),
	productContracts_supplierId: many(productContracts, {
		relationName: "productContracts_supplierId_users_id"
	}),
	productContracts_adminId: many(productContracts, {
		relationName: "productContracts_adminId_users_id"
	}),
	supplierPayments_supplierId: many(supplierPayments, {
		relationName: "supplierPayments_supplierId_users_id"
	}),
	supplierPayments_approvedBy: many(supplierPayments, {
		relationName: "supplierPayments_approvedBy_users_id"
	}),
	investments: many(investments),
	investmentTransactions_investorId: many(investmentTransactions, {
		relationName: "investmentTransactions_investorId_users_id"
	}),
	investmentTransactions_processedBy: many(investmentTransactions, {
		relationName: "investmentTransactions_processedBy_users_id"
	}),
	investmentTaxCalculations: many(investmentTaxCalculations),
	paymentReceipts_investorId: many(paymentReceipts, {
		relationName: "paymentReceipts_investorId_users_id"
	}),
	paymentReceipts_verifiedBy: many(paymentReceipts, {
		relationName: "paymentReceipts_verifiedBy_users_id"
	}),
	taxPaymentSchedules: many(taxPaymentSchedule),
	manualAdSpends: many(manualAdSpend),
	customerSupportMessages: many(customerSupportMessages),
	funnelPages: many(funnelPages),
	funnelPageRevisions: many(funnelPageRevisions),
	reimbursementRequests: many(reimbursementRequests),
	affiliateMemberships: many(affiliateMemberships),
	affiliatePayouts: many(affiliatePayouts),
	affiliateConversions: many(affiliateConversions),
	affiliateProfiles_userId: many(affiliateProfiles, {
		relationName: "affiliateProfiles_userId_users_id"
	}),
	affiliateProfiles_approvedByUserId: many(affiliateProfiles, {
		relationName: "affiliateProfiles_approvedByUserId_users_id"
	}),
	affiliateLandingPages: many(affiliateLandingPages),
}));

export const dashboardMetricsRelations = relations(dashboardMetrics, ({one}) => ({
	store: one(stores, {
		fields: [dashboardMetrics.storeId],
		references: [stores.id]
	}),
	operation: one(operations, {
		fields: [dashboardMetrics.operationId],
		references: [operations.id]
	}),
}));

export const productsRelations = relations(products, ({one, many}) => ({
	store: one(stores, {
		fields: [products.storeId],
		references: [stores.id]
	}),
	operation: one(operations, {
		fields: [products.operationId],
		references: [operations.id]
	}),
	user: one(users, {
		fields: [products.supplierId],
		references: [users.id]
	}),
	userProducts: many(userProducts),
	productContracts: many(productContracts),
	affiliateMemberships: many(affiliateMemberships),
	affiliateCommissionRules: many(affiliateCommissionRules),
	affiliateLandingPageProducts: many(affiliateLandingPageProducts),
	affiliateProductPixels: many(affiliateProductPixels),
}));

export const adAccountsRelations = relations(adAccounts, ({one}) => ({
	store: one(stores, {
		fields: [adAccounts.storeId],
		references: [stores.id]
	}),
	operation: one(operations, {
		fields: [adAccounts.operationId],
		references: [operations.id]
	}),
}));

export const shippingProvidersRelations = relations(shippingProviders, ({one}) => ({
	store: one(stores, {
		fields: [shippingProviders.storeId],
		references: [stores.id]
	}),
	operation: one(operations, {
		fields: [shippingProviders.operationId],
		references: [operations.id]
	}),
}));

export const syncJobsRelations = relations(syncJobs, ({one}) => ({
	store: one(stores, {
		fields: [syncJobs.storeId],
		references: [stores.id]
	}),
	operation: one(operations, {
		fields: [syncJobs.operationId],
		references: [operations.id]
	}),
}));

export const facebookAdsIntegrationsRelations = relations(facebookAdsIntegrations, ({one}) => ({
	operation: one(operations, {
		fields: [facebookAdsIntegrations.operationId],
		references: [operations.id]
	}),
}));

export const userOperationAccessRelations = relations(userOperationAccess, ({one}) => ({
	user: one(users, {
		fields: [userOperationAccess.userId],
		references: [users.id]
	}),
	operation: one(operations, {
		fields: [userOperationAccess.operationId],
		references: [operations.id]
	}),
}));

export const fulfillmentIntegrationsRelations = relations(fulfillmentIntegrations, ({one}) => ({
	operation: one(operations, {
		fields: [fulfillmentIntegrations.operationId],
		references: [operations.id]
	}),
	fhbAccount: one(fhbAccounts, {
		fields: [fulfillmentIntegrations.fhbAccountId],
		references: [fhbAccounts.id]
	}),
}));

export const fhbAccountsRelations = relations(fhbAccounts, ({many}) => ({
	fulfillmentIntegrations: many(fulfillmentIntegrations),
	fhbSyncLogs: many(fhbSyncLogs),
	fhbOrders: many(fhbOrders),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({one}) => ({
	order: one(orders, {
		fields: [orderStatusHistory.orderId],
		references: [orders.id]
	}),
}));

export const shopifyIntegrationsRelations = relations(shopifyIntegrations, ({one}) => ({
	operation: one(operations, {
		fields: [shopifyIntegrations.operationId],
		references: [operations.id]
	}),
}));

export const investorProfilesRelations = relations(investorProfiles, ({one}) => ({
	user: one(users, {
		fields: [investorProfiles.userId],
		references: [users.id]
	}),
}));

export const userProductsRelations = relations(userProducts, ({one}) => ({
	user: one(users, {
		fields: [userProducts.userId],
		references: [users.id]
	}),
	store: one(stores, {
		fields: [userProducts.storeId],
		references: [stores.id]
	}),
	product: one(products, {
		fields: [userProducts.productId],
		references: [products.id]
	}),
}));

export const productContractsRelations = relations(productContracts, ({one}) => ({
	product: one(products, {
		fields: [productContracts.productId],
		references: [products.id]
	}),
	user_supplierId: one(users, {
		fields: [productContracts.supplierId],
		references: [users.id],
		relationName: "productContracts_supplierId_users_id"
	}),
	user_adminId: one(users, {
		fields: [productContracts.adminId],
		references: [users.id],
		relationName: "productContracts_adminId_users_id"
	}),
}));

export const supplierPaymentItemsRelations = relations(supplierPaymentItems, ({one}) => ({
	supplierPayment: one(supplierPayments, {
		fields: [supplierPaymentItems.paymentId],
		references: [supplierPayments.id]
	}),
	order: one(orders, {
		fields: [supplierPaymentItems.orderId],
		references: [orders.id]
	}),
}));

export const supplierPaymentsRelations = relations(supplierPayments, ({one, many}) => ({
	supplierPaymentItems: many(supplierPaymentItems),
	user_supplierId: one(users, {
		fields: [supplierPayments.supplierId],
		references: [users.id],
		relationName: "supplierPayments_supplierId_users_id"
	}),
	store: one(stores, {
		fields: [supplierPayments.storeId],
		references: [stores.id]
	}),
	user_approvedBy: one(users, {
		fields: [supplierPayments.approvedBy],
		references: [users.id],
		relationName: "supplierPayments_approvedBy_users_id"
	}),
}));

export const investmentsRelations = relations(investments, ({one, many}) => ({
	user: one(users, {
		fields: [investments.investorId],
		references: [users.id]
	}),
	investmentPool: one(investmentPools, {
		fields: [investments.poolId],
		references: [investmentPools.id]
	}),
	investmentTransactions: many(investmentTransactions),
}));

export const investmentPoolsRelations = relations(investmentPools, ({many}) => ({
	investments: many(investments),
	investmentTransactions: many(investmentTransactions),
	poolPerformanceHistories: many(poolPerformanceHistory),
}));

export const investmentTransactionsRelations = relations(investmentTransactions, ({one, many}) => ({
	investment: one(investments, {
		fields: [investmentTransactions.investmentId],
		references: [investments.id]
	}),
	user_investorId: one(users, {
		fields: [investmentTransactions.investorId],
		references: [users.id],
		relationName: "investmentTransactions_investorId_users_id"
	}),
	investmentPool: one(investmentPools, {
		fields: [investmentTransactions.poolId],
		references: [investmentPools.id]
	}),
	user_processedBy: one(users, {
		fields: [investmentTransactions.processedBy],
		references: [users.id],
		relationName: "investmentTransactions_processedBy_users_id"
	}),
	paymentReceipts: many(paymentReceipts),
}));

export const poolPerformanceHistoryRelations = relations(poolPerformanceHistory, ({one}) => ({
	investmentPool: one(investmentPools, {
		fields: [poolPerformanceHistory.poolId],
		references: [investmentPools.id]
	}),
}));

export const investmentTaxCalculationsRelations = relations(investmentTaxCalculations, ({one, many}) => ({
	user: one(users, {
		fields: [investmentTaxCalculations.investorId],
		references: [users.id]
	}),
	taxPaymentSchedules: many(taxPaymentSchedule),
}));

export const paymentReceiptsRelations = relations(paymentReceipts, ({one}) => ({
	investmentTransaction: one(investmentTransactions, {
		fields: [paymentReceipts.transactionId],
		references: [investmentTransactions.id]
	}),
	user_investorId: one(users, {
		fields: [paymentReceipts.investorId],
		references: [users.id],
		relationName: "paymentReceipts_investorId_users_id"
	}),
	user_verifiedBy: one(users, {
		fields: [paymentReceipts.verifiedBy],
		references: [users.id],
		relationName: "paymentReceipts_verifiedBy_users_id"
	}),
}));

export const taxPaymentScheduleRelations = relations(taxPaymentSchedule, ({one}) => ({
	user: one(users, {
		fields: [taxPaymentSchedule.investorId],
		references: [users.id]
	}),
	investmentTaxCalculation: one(investmentTaxCalculations, {
		fields: [taxPaymentSchedule.calculationId],
		references: [investmentTaxCalculations.id]
	}),
}));

export const manualAdSpendRelations = relations(manualAdSpend, ({one}) => ({
	operation: one(operations, {
		fields: [manualAdSpend.operationId],
		references: [operations.id]
	}),
	user: one(users, {
		fields: [manualAdSpend.createdBy],
		references: [users.id]
	}),
}));

export const supportResponsesRelations = relations(supportResponses, ({one}) => ({
	supportCategory: one(supportCategories, {
		fields: [supportResponses.categoryId],
		references: [supportCategories.id]
	}),
}));

export const supportCategoriesRelations = relations(supportCategories, ({many}) => ({
	supportResponses: many(supportResponses),
	supportMetrics: many(supportMetrics),
	supportTickets: many(supportTickets),
	supportEmails: many(supportEmails),
	voiceCalls: many(voiceCalls),
}));

export const supportConversationsRelations = relations(supportConversations, ({one}) => ({
	supportTicket: one(supportTickets, {
		fields: [supportConversations.ticketId],
		references: [supportTickets.id]
	}),
}));

export const supportTicketsRelations = relations(supportTickets, ({one, many}) => ({
	supportConversations: many(supportConversations),
	supportEmail: one(supportEmails, {
		fields: [supportTickets.emailId],
		references: [supportEmails.id]
	}),
	supportCategory: one(supportCategories, {
		fields: [supportTickets.categoryId],
		references: [supportCategories.id]
	}),
	order: one(orders, {
		fields: [supportTickets.linkedOrderId],
		references: [orders.id]
	}),
	voiceCalls: many(voiceCalls),
	reimbursementRequests: many(reimbursementRequests),
}));

export const supportMetricsRelations = relations(supportMetrics, ({one}) => ({
	supportCategory: one(supportCategories, {
		fields: [supportMetrics.categoryId],
		references: [supportCategories.id]
	}),
}));

export const supportEmailsRelations = relations(supportEmails, ({one, many}) => ({
	supportTickets: many(supportTickets),
	supportCategory: one(supportCategories, {
		fields: [supportEmails.categoryId],
		references: [supportCategories.id]
	}),
}));

export const customerSupportMessagesRelations = relations(customerSupportMessages, ({one}) => ({
	user: one(users, {
		fields: [customerSupportMessages.senderUserId],
		references: [users.id]
	}),
}));

export const aiDirectivesRelations = relations(aiDirectives, ({one}) => ({
	operation: one(operations, {
		fields: [aiDirectives.operationId],
		references: [operations.id]
	}),
}));

export const creativeAnalysesRelations = relations(creativeAnalyses, ({one, many}) => ({
	adCreative: one(adCreatives, {
		fields: [creativeAnalyses.creativeId],
		references: [adCreatives.id]
	}),
	operation: one(operations, {
		fields: [creativeAnalyses.operationId],
		references: [operations.id]
	}),
	creativeEditPlans: many(creativeEditPlans),
}));

export const adCreativesRelations = relations(adCreatives, ({one, many}) => ({
	creativeAnalyses: many(creativeAnalyses),
	operation: one(operations, {
		fields: [adCreatives.operationId],
		references: [operations.id]
	}),
	creativeEditPlans: many(creativeEditPlans),
	creativeVariations_originalCreativeId: many(creativeVariations, {
		relationName: "creativeVariations_originalCreativeId_adCreatives_id"
	}),
	creativeVariations_variationCreativeId: many(creativeVariations, {
		relationName: "creativeVariations_variationCreativeId_adCreatives_id"
	}),
}));

export const voiceConversationsRelations = relations(voiceConversations, ({one}) => ({
	voiceCall: one(voiceCalls, {
		fields: [voiceConversations.callId],
		references: [voiceCalls.id]
	}),
}));

export const voiceCallsRelations = relations(voiceCalls, ({one, many}) => ({
	voiceConversations: many(voiceConversations),
	operation: one(operations, {
		fields: [voiceCalls.operationId],
		references: [operations.id]
	}),
	supportTicket: one(supportTickets, {
		fields: [voiceCalls.relatedTicketId],
		references: [supportTickets.id]
	}),
	supportCategory: one(supportCategories, {
		fields: [voiceCalls.categoryId],
		references: [supportCategories.id]
	}),
}));

export const voiceSettingsRelations = relations(voiceSettings, ({one}) => ({
	operation: one(operations, {
		fields: [voiceSettings.operationId],
		references: [operations.id]
	}),
}));

export const creativeEditPlansRelations = relations(creativeEditPlans, ({one, many}) => ({
	adCreative: one(adCreatives, {
		fields: [creativeEditPlans.creativeId],
		references: [adCreatives.id]
	}),
	creativeAnalysis: one(creativeAnalyses, {
		fields: [creativeEditPlans.analysisId],
		references: [creativeAnalyses.id]
	}),
	creativeVariations: many(creativeVariations),
}));

export const creativeVariationsRelations = relations(creativeVariations, ({one, many}) => ({
	adCreative_originalCreativeId: one(adCreatives, {
		fields: [creativeVariations.originalCreativeId],
		references: [adCreatives.id],
		relationName: "creativeVariations_originalCreativeId_adCreatives_id"
	}),
	adCreative_variationCreativeId: one(adCreatives, {
		fields: [creativeVariations.variationCreativeId],
		references: [adCreatives.id],
		relationName: "creativeVariations_variationCreativeId_adCreatives_id"
	}),
	creativeVariation: one(creativeVariations, {
		fields: [creativeVariations.parentVariationId],
		references: [creativeVariations.id],
		relationName: "creativeVariations_parentVariationId_creativeVariations_id"
	}),
	creativeVariations: many(creativeVariations, {
		relationName: "creativeVariations_parentVariationId_creativeVariations_id"
	}),
	creativeEditPlan: one(creativeEditPlans, {
		fields: [creativeVariations.editPlanId],
		references: [creativeEditPlans.id]
	}),
}));

export const productOperationLinksRelations = relations(productOperationLinks, ({one}) => ({
	operation: one(operations, {
		fields: [productOperationLinks.operationId],
		references: [operations.id]
	}),
	store: one(stores, {
		fields: [productOperationLinks.storeId],
		references: [stores.id]
	}),
	marketplaceProduct: one(marketplaceProducts, {
		fields: [productOperationLinks.marketplaceProductId],
		references: [marketplaceProducts.id]
	}),
}));

export const marketplaceProductsRelations = relations(marketplaceProducts, ({many}) => ({
	productOperationLinks: many(productOperationLinks),
}));

export const announcementsRelations = relations(announcements, ({one}) => ({
	operation: one(operations, {
		fields: [announcements.operationId],
		references: [operations.id]
	}),
}));

export const funnelPagesRelations = relations(funnelPages, ({one, many}) => ({
	funnel: one(funnels, {
		fields: [funnelPages.funnelId],
		references: [funnels.id]
	}),
	funnelPageTemplate: one(funnelPageTemplates, {
		fields: [funnelPages.templateId],
		references: [funnelPageTemplates.id]
	}),
	user: one(users, {
		fields: [funnelPages.lastEditedBy],
		references: [users.id]
	}),
	funnelPageRevisions: many(funnelPageRevisions),
}));

export const funnelsRelations = relations(funnels, ({many}) => ({
	funnelPages: many(funnelPages),
}));

export const funnelPageTemplatesRelations = relations(funnelPageTemplates, ({many}) => ({
	funnelPages: many(funnelPages),
}));

export const funnelPageRevisionsRelations = relations(funnelPageRevisions, ({one}) => ({
	funnelPage: one(funnelPages, {
		fields: [funnelPageRevisions.pageId],
		references: [funnelPages.id]
	}),
	user: one(users, {
		fields: [funnelPageRevisions.createdBy],
		references: [users.id]
	}),
}));

export const cartpandaIntegrationsRelations = relations(cartpandaIntegrations, ({one}) => ({
	operation: one(operations, {
		fields: [cartpandaIntegrations.operationId],
		references: [operations.id]
	}),
}));

export const reimbursementRequestsRelations = relations(reimbursementRequests, ({one}) => ({
	supportTicket: one(supportTickets, {
		fields: [reimbursementRequests.ticketId],
		references: [supportTickets.id]
	}),
	user: one(users, {
		fields: [reimbursementRequests.reviewedByUserId],
		references: [users.id]
	}),
}));

export const affiliateMembershipsRelations = relations(affiliateMemberships, ({one}) => ({
	affiliateProfile: one(affiliateProfiles, {
		fields: [affiliateMemberships.affiliateId],
		references: [affiliateProfiles.id]
	}),
	operation: one(operations, {
		fields: [affiliateMemberships.operationId],
		references: [operations.id]
	}),
	product: one(products, {
		fields: [affiliateMemberships.productId],
		references: [products.id]
	}),
	user: one(users, {
		fields: [affiliateMemberships.approvedByUserId],
		references: [users.id]
	}),
}));

export const affiliateProfilesRelations = relations(affiliateProfiles, ({one, many}) => ({
	affiliateMemberships: many(affiliateMemberships),
	affiliatePayouts: many(affiliatePayouts),
	affiliateConversions: many(affiliateConversions),
	affiliateClicks: many(affiliateClicks),
	user_userId: one(users, {
		fields: [affiliateProfiles.userId],
		references: [users.id],
		relationName: "affiliateProfiles_userId_users_id"
	}),
	store: one(stores, {
		fields: [affiliateProfiles.storeId],
		references: [stores.id]
	}),
	user_approvedByUserId: one(users, {
		fields: [affiliateProfiles.approvedByUserId],
		references: [users.id],
		relationName: "affiliateProfiles_approvedByUserId_users_id"
	}),
	affiliateProductPixels: many(affiliateProductPixels),
}));

export const affiliateCommissionRulesRelations = relations(affiliateCommissionRules, ({one}) => ({
	operation: one(operations, {
		fields: [affiliateCommissionRules.operationId],
		references: [operations.id]
	}),
	product: one(products, {
		fields: [affiliateCommissionRules.productId],
		references: [products.id]
	}),
}));

export const affiliatePayoutsRelations = relations(affiliatePayouts, ({one, many}) => ({
	affiliateProfile: one(affiliateProfiles, {
		fields: [affiliatePayouts.affiliateId],
		references: [affiliateProfiles.id]
	}),
	user: one(users, {
		fields: [affiliatePayouts.paidByUserId],
		references: [users.id]
	}),
	affiliateConversions: many(affiliateConversions),
}));

export const affiliateConversionsRelations = relations(affiliateConversions, ({one, many}) => ({
	affiliateProfile: one(affiliateProfiles, {
		fields: [affiliateConversions.affiliateId],
		references: [affiliateProfiles.id]
	}),
	order: one(orders, {
		fields: [affiliateConversions.orderId],
		references: [orders.id]
	}),
	user: one(users, {
		fields: [affiliateConversions.approvedByUserId],
		references: [users.id]
	}),
	affiliatePayout: one(affiliatePayouts, {
		fields: [affiliateConversions.payoutId],
		references: [affiliatePayouts.id]
	}),
	affiliateClicks: many(affiliateClicks),
}));

export const affiliateClicksRelations = relations(affiliateClicks, ({one}) => ({
	affiliateProfile: one(affiliateProfiles, {
		fields: [affiliateClicks.affiliateId],
		references: [affiliateProfiles.id]
	}),
	affiliateConversion: one(affiliateConversions, {
		fields: [affiliateClicks.conversionId],
		references: [affiliateConversions.id]
	}),
}));

export const vercelDeploymentConfigRelations = relations(vercelDeploymentConfig, ({one}) => ({
	operation: one(operations, {
		fields: [vercelDeploymentConfig.operationId],
		references: [operations.id]
	}),
}));

export const affiliateLandingPageProductsRelations = relations(affiliateLandingPageProducts, ({one}) => ({
	affiliateLandingPage: one(affiliateLandingPages, {
		fields: [affiliateLandingPageProducts.landingPageId],
		references: [affiliateLandingPages.id]
	}),
	product: one(products, {
		fields: [affiliateLandingPageProducts.productId],
		references: [products.id]
	}),
}));

export const affiliateLandingPagesRelations = relations(affiliateLandingPages, ({one, many}) => ({
	affiliateLandingPageProducts: many(affiliateLandingPageProducts),
	user: one(users, {
		fields: [affiliateLandingPages.createdByUserId],
		references: [users.id]
	}),
	affiliateProductPixels: many(affiliateProductPixels),
}));

export const affiliateProductPixelsRelations = relations(affiliateProductPixels, ({one}) => ({
	affiliateProfile: one(affiliateProfiles, {
		fields: [affiliateProductPixels.affiliateId],
		references: [affiliateProfiles.id]
	}),
	product: one(products, {
		fields: [affiliateProductPixels.productId],
		references: [products.id]
	}),
	affiliateLandingPage: one(affiliateLandingPages, {
		fields: [affiliateProductPixels.landingPageId],
		references: [affiliateLandingPages.id]
	}),
}));

export const webhookLogsRelations = relations(webhookLogs, ({one}) => ({
	integrationConfig: one(integrationConfigs, {
		fields: [webhookLogs.integrationConfigId],
		references: [integrationConfigs.id]
	}),
	order: one(orders, {
		fields: [webhookLogs.orderId],
		references: [orders.id]
	}),
}));

export const integrationConfigsRelations = relations(integrationConfigs, ({one, many}) => ({
	webhookLogs: many(webhookLogs),
	operation: one(operations, {
		fields: [integrationConfigs.operationId],
		references: [operations.id]
	}),
}));

export const googleAdsIntegrationsRelations = relations(googleAdsIntegrations, ({one}) => ({
	operation: one(operations, {
		fields: [googleAdsIntegrations.operationId],
		references: [operations.id]
	}),
}));

export const fhbSyncLogsRelations = relations(fhbSyncLogs, ({one}) => ({
	fhbAccount: one(fhbAccounts, {
		fields: [fhbSyncLogs.fhbAccountId],
		references: [fhbAccounts.id]
	}),
}));

export const fhbOrdersRelations = relations(fhbOrders, ({one}) => ({
	fhbAccount: one(fhbAccounts, {
		fields: [fhbOrders.fhbAccountId],
		references: [fhbAccounts.id]
	}),
}));