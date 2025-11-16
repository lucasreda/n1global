CREATE TABLE "ad_accounts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" varchar NOT NULL,
	"operation_id" varchar,
	"network" varchar(20) NOT NULL,
	"account_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"business_manager_id" varchar(255),
	"manager_id" varchar(255),
	"access_token" text,
	"refresh_token" text,
	"app_id" varchar(255),
	"app_secret" text,
	"client_id" varchar(255),
	"client_secret" text,
	"is_active" boolean DEFAULT true,
	"currency" varchar(10) DEFAULT 'EUR',
	"base_currency" varchar(10) DEFAULT 'BRL',
	"timezone" varchar(50) DEFAULT 'Europe/Rome',
	"last_sync" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ad_creatives" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" varchar NOT NULL,
	"network" varchar(20) NOT NULL,
	"account_id" varchar NOT NULL,
	"campaign_id" varchar NOT NULL,
	"ad_id" varchar NOT NULL,
	"creative_id" varchar,
	"name" text,
	"status" text,
	"type" text,
	"thumbnail_url" text,
	"image_url" text,
	"video_url" text,
	"primary_text" text,
	"headline" text,
	"description" text,
	"link_url" text,
	"cta_type" text,
	"period" text,
	"impressions" integer DEFAULT 0,
	"clicks" integer DEFAULT 0,
	"spend" numeric(12, 2) DEFAULT '0',
	"cpm" numeric(10, 2) DEFAULT '0',
	"cpc" numeric(10, 2) DEFAULT '0',
	"ctr" numeric(8, 4) DEFAULT '0',
	"conversions" integer DEFAULT 0,
	"conversion_rate" numeric(8, 4) DEFAULT '0',
	"roas" numeric(10, 2) DEFAULT '0',
	"is_analyzed" boolean DEFAULT false,
	"is_new" boolean DEFAULT true,
	"last_sync" timestamp,
	"provider_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "ad_creatives_ad_id_unique" UNIQUE("ad_id")
);
--> statement-breakpoint
CREATE TABLE "ai_directives" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" varchar NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"network" varchar(20) NOT NULL,
	"campaign_id" varchar(255) NOT NULL,
	"account_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" varchar(50) NOT NULL,
	"objective" varchar(100),
	"campaign_type" varchar(100),
	"daily_budget" numeric(10, 2),
	"lifetime_budget" numeric(10, 2),
	"amount_spent" numeric(10, 2) DEFAULT '0',
	"original_amount_spent" numeric(10, 2),
	"original_currency" varchar(10) DEFAULT 'USD',
	"impressions" integer DEFAULT 0,
	"clicks" integer DEFAULT 0,
	"cpm" numeric(10, 2) DEFAULT '0',
	"cpc" numeric(10, 2) DEFAULT '0',
	"ctr" numeric(10, 4) DEFAULT '0',
	"is_selected" boolean DEFAULT false,
	"start_time" timestamp,
	"end_time" timestamp,
	"last_sync" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "creative_analyses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" varchar NOT NULL,
	"creative_id" varchar,
	"batch_id" varchar,
	"status" text NOT NULL,
	"analysis_type" text NOT NULL,
	"provider" text DEFAULT 'hybrid' NOT NULL,
	"model" text,
	"cost_estimate" numeric(10, 4) DEFAULT '0',
	"actual_cost" numeric(10, 4) DEFAULT '0',
	"input_tokens" integer DEFAULT 0,
	"output_tokens" integer DEFAULT 0,
	"audio_analysis" jsonb,
	"audio_processing_time" integer,
	"audio_cost" numeric(10, 4) DEFAULT '0',
	"visual_analysis" jsonb,
	"visual_processing_time" integer,
	"visual_cost" numeric(10, 4) DEFAULT '0',
	"fusion_analysis" jsonb,
	"result" jsonb,
	"insights" jsonb,
	"recommendations" jsonb,
	"scores" jsonb,
	"error" text,
	"progress" jsonb,
	"current_step" integer DEFAULT 0,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "currency_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" text NOT NULL,
	"eur_to_brl" numeric(10, 6),
	"usd_to_brl" numeric(10, 6),
	"gbp_to_brl" numeric(10, 6),
	"ars_to_brl" numeric(10, 6),
	"clp_to_brl" numeric(10, 6),
	"cad_to_brl" numeric(10, 6),
	"aud_to_brl" numeric(10, 6),
	"jpy_to_brl" numeric(10, 6),
	"source" text DEFAULT 'currencyapi' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "currency_history_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "currency_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"currency" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"base_currency" text DEFAULT 'BRL' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_support_categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" varchar NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"is_automated" boolean DEFAULT false,
	"ai_enabled" boolean DEFAULT false,
	"default_response" text,
	"priority" integer DEFAULT 0,
	"color" text DEFAULT '#6b7280',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "customer_support_categories_operation_id_name_unique" UNIQUE("operation_id","name")
);
--> statement-breakpoint
CREATE TABLE "customer_support_emails" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" varchar NOT NULL,
	"message_id" text NOT NULL,
	"thread_id" varchar,
	"from_email" varchar NOT NULL,
	"from_name" varchar,
	"to_email" varchar NOT NULL,
	"cc_emails" jsonb,
	"bcc_emails" jsonb,
	"subject" varchar NOT NULL,
	"text_content" text,
	"html_content" text,
	"status" varchar DEFAULT 'received',
	"ticket_id" varchar,
	"category_id" varchar,
	"ai_confidence" integer,
	"ai_reasoning" text,
	"is_spam" boolean DEFAULT false,
	"is_auto_reply" boolean DEFAULT false,
	"requires_human" boolean DEFAULT false,
	"has_auto_response" boolean DEFAULT false,
	"attachments" jsonb,
	"headers" jsonb,
	"raw_data" jsonb,
	"received_at" timestamp DEFAULT now(),
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "customer_support_emails_operation_id_message_id_unique" UNIQUE("operation_id","message_id")
);
--> statement-breakpoint
CREATE TABLE "customer_support_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" varchar NOT NULL,
	"ticket_id" varchar NOT NULL,
	"sender" varchar NOT NULL,
	"sender_name" varchar,
	"sender_email" varchar,
	"sender_user_id" varchar,
	"subject" varchar,
	"content" text NOT NULL,
	"html_content" text,
	"message_type" varchar DEFAULT 'email',
	"is_internal" boolean DEFAULT false,
	"is_public" boolean DEFAULT true,
	"is_ai_generated" boolean DEFAULT false,
	"ai_model" varchar,
	"ai_prompt_used" text,
	"email_message_id" varchar,
	"email_in_reply_to" varchar,
	"email_references" text,
	"attachments" jsonb,
	"sent_via_email" boolean DEFAULT false,
	"email_sent_at" timestamp,
	"email_delivered" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_support_operations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" varchar NOT NULL,
	"operation_name" varchar,
	"email_domain" varchar,
	"email_prefix" varchar DEFAULT 'suporte',
	"is_custom_domain" boolean DEFAULT false,
	"mailgun_domain_name" varchar,
	"mailgun_api_key" varchar,
	"domain_verified" boolean DEFAULT false,
	"ai_enabled" boolean DEFAULT true,
	"ai_categories" jsonb,
	"branding_config" jsonb,
	"email_template_id" varchar,
	"business_hours" jsonb,
	"timezone" varchar DEFAULT 'America/Sao_Paulo',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "customer_support_operations_operation_id_unique" UNIQUE("operation_id")
);
--> statement-breakpoint
CREATE TABLE "customer_support_tickets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" varchar NOT NULL,
	"ticket_number" text NOT NULL,
	"customer_email" varchar NOT NULL,
	"customer_name" varchar,
	"subject" varchar NOT NULL,
	"status" varchar DEFAULT 'open' NOT NULL,
	"priority" varchar DEFAULT 'medium',
	"category_id" varchar,
	"category_name" varchar,
	"assigned_agent_id" varchar,
	"assigned_agent_name" varchar,
	"is_automated" boolean DEFAULT false,
	"requires_human" boolean DEFAULT false,
	"ai_confidence" integer,
	"ai_reasoning" text,
	"original_email_id" varchar,
	"thread_id" varchar,
	"resolved_at" timestamp,
	"resolution_time_minutes" integer,
	"customer_satisfaction" integer,
	"tags" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"last_activity" timestamp DEFAULT now(),
	CONSTRAINT "customer_support_tickets_operation_id_ticket_number_unique" UNIQUE("operation_id","ticket_number")
);
--> statement-breakpoint
CREATE TABLE "dashboard_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" varchar NOT NULL,
	"operation_id" varchar,
	"period" text NOT NULL,
	"provider" text,
	"total_orders" integer DEFAULT 0,
	"delivered_orders" integer DEFAULT 0,
	"cancelled_orders" integer DEFAULT 0,
	"shipped_orders" integer DEFAULT 0,
	"pending_orders" integer DEFAULT 0,
	"returned_orders" integer DEFAULT 0,
	"confirmed_orders" integer DEFAULT 0,
	"total_revenue" numeric(12, 2) DEFAULT '0',
	"delivered_revenue" numeric(12, 2) DEFAULT '0',
	"paid_revenue" numeric(12, 2) DEFAULT '0',
	"average_order_value" numeric(8, 2) DEFAULT '0',
	"total_product_costs" numeric(12, 2) DEFAULT '0',
	"total_shipping_costs" numeric(12, 2) DEFAULT '0',
	"total_combined_costs" numeric(12, 2) DEFAULT '0',
	"marketing_costs" numeric(12, 2) DEFAULT '0',
	"total_profit" numeric(12, 2) DEFAULT '0',
	"profit_margin" numeric(8, 2) DEFAULT '0',
	"roi" numeric(8, 2) DEFAULT '0',
	"unique_customers" integer DEFAULT 0,
	"avg_delivery_time_days" numeric(8, 2) DEFAULT '0',
	"cac_brl" numeric(12, 2) DEFAULT '0',
	"cac_eur" numeric(12, 2) DEFAULT '0',
	"cpa_ads_brl" numeric(12, 2) DEFAULT '0',
	"cpa_ads_eur" numeric(12, 2) DEFAULT '0',
	"calculated_at" timestamp NOT NULL,
	"valid_until" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "facebook_ad_accounts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"business_manager_id" varchar(255),
	"access_token" text,
	"app_id" varchar(255),
	"app_secret" text,
	"is_active" boolean DEFAULT true,
	"currency" varchar(10) DEFAULT 'EUR',
	"base_currency" varchar(10) DEFAULT 'BRL',
	"timezone" varchar(50) DEFAULT 'Europe/Rome',
	"last_sync" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "facebook_ad_accounts_account_id_unique" UNIQUE("account_id")
);
--> statement-breakpoint
CREATE TABLE "facebook_ads_integrations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" varchar NOT NULL,
	"account_id" text NOT NULL,
	"account_name" text,
	"access_token" text NOT NULL,
	"selected_campaign_ids" text[] DEFAULT '{}',
	"status" text DEFAULT 'active' NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "facebook_business_managers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"access_token" text,
	"is_active" boolean DEFAULT true,
	"last_sync" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "facebook_business_managers_business_id_unique" UNIQUE("business_id")
);
--> statement-breakpoint
CREATE TABLE "facebook_campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" varchar(255) NOT NULL,
	"account_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" varchar(50) NOT NULL,
	"objective" varchar(100),
	"daily_budget" numeric(10, 2),
	"lifetime_budget" numeric(10, 2),
	"amount_spent" numeric(10, 2) DEFAULT '0',
	"original_amount_spent" numeric(10, 2),
	"original_currency" varchar(10) DEFAULT 'USD',
	"impressions" integer DEFAULT 0,
	"clicks" integer DEFAULT 0,
	"cpm" numeric(10, 2) DEFAULT '0',
	"cpc" numeric(10, 2) DEFAULT '0',
	"ctr" numeric(10, 4) DEFAULT '0',
	"is_selected" boolean DEFAULT false,
	"start_time" timestamp,
	"end_time" timestamp,
	"last_sync" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "facebook_campaigns_campaign_id_unique" UNIQUE("campaign_id")
);
--> statement-breakpoint
CREATE TABLE "fulfillment_integrations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" varchar NOT NULL,
	"provider" text NOT NULL,
	"credentials" jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "investment_pools" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"total_value" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_invested" numeric(15, 2) DEFAULT '0' NOT NULL,
	"monthly_return" numeric(5, 4) DEFAULT '0',
	"yearly_return" numeric(5, 4) DEFAULT '0',
	"status" text DEFAULT 'active' NOT NULL,
	"min_investment" numeric(10, 2) DEFAULT '1000' NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"risk_level" text DEFAULT 'medium' NOT NULL,
	"investment_strategy" text,
	"cnpj" text,
	"cvm_registration" text,
	"audit_report" text,
	"portfolio_composition" jsonb,
	"management_fee_rate" numeric(5, 4) DEFAULT '0',
	"administrative_expenses" numeric(10, 2) DEFAULT '0',
	"ir_retention_history" jsonb,
	"benchmark_index" text DEFAULT 'CDI',
	"come_cotas_rate" numeric(5, 4) DEFAULT '0',
	"custody_provider" text,
	"liquidation_process" text,
	"monthly_reports" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "investment_pools_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "investment_tax_calculations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"investor_id" varchar NOT NULL,
	"tax_year" integer NOT NULL,
	"reference_month" integer,
	"total_gains" numeric(12, 2) DEFAULT '0' NOT NULL,
	"taxable_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_rate" numeric(5, 4) NOT NULL,
	"tax_due" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tax_paid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"due_date" timestamp,
	"paid_date" timestamp,
	"calculation_details" jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "investment_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"investment_id" varchar NOT NULL,
	"investor_id" varchar NOT NULL,
	"pool_id" varchar NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"payment_method" text,
	"payment_reference" text,
	"payment_status" text DEFAULT 'pending',
	"description" text,
	"metadata" jsonb,
	"processed_at" timestamp,
	"processed_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "investments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"investor_id" varchar NOT NULL,
	"pool_id" varchar NOT NULL,
	"total_invested" numeric(12, 2) DEFAULT '0' NOT NULL,
	"current_value" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_returns" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_paid_out" numeric(12, 2) DEFAULT '0' NOT NULL,
	"return_rate" numeric(5, 4) DEFAULT '0',
	"monthly_return" numeric(5, 4) DEFAULT '0',
	"status" text DEFAULT 'active' NOT NULL,
	"first_investment_date" timestamp,
	"last_transaction_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "investor_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"first_name" text,
	"last_name" text,
	"birth_date" timestamp,
	"nationality" text,
	"phone" text,
	"address" text,
	"city" text,
	"postal_code" text,
	"country" text,
	"risk_tolerance" text DEFAULT 'medium',
	"investment_experience" text DEFAULT 'beginner',
	"investment_goals" text,
	"monthly_income_range" text,
	"bank_name" text,
	"account_number" text,
	"routing_number" text,
	"account_holder_name" text,
	"kyc_status" text DEFAULT 'pending',
	"kyc_documents" jsonb,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "investor_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "manual_ad_spend" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" varchar NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"platform" text NOT NULL,
	"spend_date" timestamp NOT NULL,
	"description" text,
	"notes" text,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "operations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"store_id" varchar NOT NULL,
	"country" text NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"settings" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" text NOT NULL,
	"previous_status" text,
	"new_status" text NOT NULL,
	"comment" text,
	"changed_at" timestamp NOT NULL,
	"provider_data" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"store_id" varchar NOT NULL,
	"operation_id" varchar,
	"data_source" text DEFAULT 'shopify' NOT NULL,
	"shopify_order_id" text,
	"shopify_order_number" text,
	"carrier_imported" boolean DEFAULT false NOT NULL,
	"carrier_matched_at" timestamp,
	"carrier_order_id" text,
	"customer_id" text,
	"customer_name" text,
	"customer_email" text,
	"customer_phone" text,
	"customer_address" text,
	"customer_city" text,
	"customer_state" text,
	"customer_country" text,
	"customer_zip" text,
	"status" text NOT NULL,
	"payment_status" text,
	"payment_method" text,
	"total" numeric(10, 2),
	"product_cost" numeric(10, 2) DEFAULT '0',
	"shipping_cost" numeric(10, 2) DEFAULT '0',
	"currency" text DEFAULT 'EUR',
	"products" jsonb,
	"provider" text DEFAULT 'european_fulfillment' NOT NULL,
	"provider_order_id" text,
	"tracking_number" text,
	"provider_data" jsonb,
	"shopify_data" jsonb,
	"order_date" timestamp,
	"last_status_update" timestamp,
	"notes" text,
	"tags" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_receipts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" varchar NOT NULL,
	"investor_id" varchar NOT NULL,
	"receipt_number" text,
	"receipt_type" text NOT NULL,
	"file_url" text,
	"file_name" text,
	"file_size" integer,
	"file_mime_type" text,
	"bank_name" text,
	"account_number" text,
	"routing_number" text,
	"authentication_code" text,
	"fund_source" text NOT NULL,
	"fund_source_description" text,
	"fund_source_documents" jsonb,
	"is_verified" boolean DEFAULT false,
	"verified_by" varchar,
	"verified_at" timestamp,
	"verification_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pool_performance_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" varchar NOT NULL,
	"period" text NOT NULL,
	"period_date" timestamp NOT NULL,
	"total_value" numeric(15, 2) NOT NULL,
	"total_invested" numeric(15, 2) NOT NULL,
	"return_rate" numeric(5, 4) NOT NULL,
	"benchmark_return" numeric(5, 4),
	"number_of_investors" integer DEFAULT 0,
	"new_investments" numeric(12, 2) DEFAULT '0',
	"withdrawals" numeric(12, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_contracts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" varchar NOT NULL,
	"supplier_id" varchar NOT NULL,
	"admin_id" varchar NOT NULL,
	"contract_title" text DEFAULT 'Contrato de Fornecimento de Produto' NOT NULL,
	"contract_content" text NOT NULL,
	"contract_terms" jsonb,
	"status" varchar(50) DEFAULT 'sent' NOT NULL,
	"sent_at" timestamp DEFAULT now(),
	"viewed_at" timestamp,
	"responded_at" timestamp,
	"delivery_days" integer DEFAULT 30,
	"minimum_order" integer DEFAULT 1,
	"commission_rate" numeric(5, 2) DEFAULT '15.00',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" varchar NOT NULL,
	"operation_id" varchar,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text DEFAULT 'fisico' NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"low_stock" integer DEFAULT 10 NOT NULL,
	"image_url" text,
	"video_url" text,
	"product_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"cost_price" numeric(10, 2),
	"shipping_cost" numeric(10, 2),
	"handling_fee" numeric(10, 2),
	"marketing_cost" numeric(10, 2),
	"operational_cost" numeric(10, 2),
	"profit_margin" numeric(5, 2),
	"last_cost_update" timestamp,
	"providers" jsonb,
	"supplier_id" varchar,
	"initial_stock" integer DEFAULT 0,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "shipping_providers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" varchar NOT NULL,
	"operation_id" varchar NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'custom' NOT NULL,
	"login" text,
	"password" text,
	"api_key" text,
	"api_url" text,
	"description" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"last_test_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "shopify_integrations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" varchar NOT NULL,
	"shop_name" text NOT NULL,
	"access_token" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"last_sync_at" timestamp,
	"sync_errors" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"owner_id" varchar NOT NULL,
	"settings" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supplier_payment_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" varchar NOT NULL,
	"order_id" text,
	"product_sku" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supplier_payments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" varchar NOT NULL,
	"store_id" varchar NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"amount_brl" numeric(12, 2),
	"currency" text DEFAULT 'EUR' NOT NULL,
	"exchange_rate" numeric(10, 4),
	"description" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_method" text,
	"due_date" timestamp,
	"approved_at" timestamp,
	"paid_at" timestamp,
	"reference_id" text,
	"bank_details" jsonb,
	"notes" text,
	"approved_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "support_categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"is_automated" boolean DEFAULT false NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"color" text DEFAULT '#6b7280',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "support_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "support_conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" varchar NOT NULL,
	"type" text NOT NULL,
	"from" text,
	"to" text,
	"subject" text,
	"content" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"message_id" text,
	"user_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "support_emails" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" text NOT NULL,
	"in_reply_to" text,
	"references" text,
	"from_email" text NOT NULL,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"text_content" text,
	"html_content" text,
	"attachments" jsonb,
	"category_id" varchar,
	"ai_confidence" integer,
	"ai_reasoning" text,
	"sentiment" text,
	"emotion" text,
	"urgency" text,
	"tone" text,
	"has_time_constraint" boolean,
	"escalation_risk" integer,
	"status" text DEFAULT 'received' NOT NULL,
	"is_urgent" boolean DEFAULT false NOT NULL,
	"requires_human" boolean DEFAULT false NOT NULL,
	"has_auto_response" boolean DEFAULT false NOT NULL,
	"auto_response_sent_at" timestamp,
	"raw_data" jsonb,
	"received_at" timestamp DEFAULT now(),
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "support_emails_message_id_unique" UNIQUE("message_id")
);
--> statement-breakpoint
CREATE TABLE "support_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" text NOT NULL,
	"period" text NOT NULL,
	"emails_received" integer DEFAULT 0,
	"tickets_created" integer DEFAULT 0,
	"tickets_resolved" integer DEFAULT 0,
	"tickets_closed" integer DEFAULT 0,
	"category_breakdown" jsonb,
	"avg_response_time_minutes" numeric(10, 2) DEFAULT '0',
	"avg_resolution_time_minutes" numeric(10, 2) DEFAULT '0',
	"automation_rate" numeric(5, 2) DEFAULT '0',
	"customer_satisfaction_score" numeric(3, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "support_responses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" varchar NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"text_content" text NOT NULL,
	"html_content" text,
	"variables" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"delay_minutes" integer DEFAULT 0,
	"times_used" integer DEFAULT 0,
	"last_used" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_number" text NOT NULL,
	"email_id" varchar NOT NULL,
	"category_id" varchar NOT NULL,
	"assigned_to_user_id" varchar,
	"customer_email" text NOT NULL,
	"customer_name" text,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution" text,
	"resolved_at" timestamp,
	"resolved_by_user_id" varchar,
	"response_time" integer,
	"resolution_time" integer,
	"tags" text[] DEFAULT '{}',
	"internal_notes" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "support_tickets_ticket_number_unique" UNIQUE("ticket_number")
);
--> statement-breakpoint
CREATE TABLE "sync_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" varchar NOT NULL,
	"operation_id" varchar,
	"provider" text NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"orders_processed" integer DEFAULT 0,
	"orders_created" integer DEFAULT 0,
	"orders_updated" integer DEFAULT 0,
	"error_count" integer DEFAULT 0,
	"last_processed_id" text,
	"logs" jsonb,
	"error" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tax_payment_schedule" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"investor_id" varchar NOT NULL,
	"calculation_id" varchar,
	"tax_type" text NOT NULL,
	"payment_type" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"due_date" timestamp NOT NULL,
	"reminder_date" timestamp,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"paid_date" timestamp,
	"payment_reference" text,
	"reminder_sent" boolean DEFAULT false,
	"reminder_sent_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_operation_access" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"operation_id" varchar NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"permissions" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_products" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"store_id" varchar NOT NULL,
	"product_id" varchar NOT NULL,
	"sku" text NOT NULL,
	"custom_cost_price" numeric(10, 2),
	"custom_shipping_cost" numeric(10, 2),
	"custom_handling_fee" numeric(10, 2),
	"linked_at" timestamp DEFAULT now(),
	"last_updated" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"store_id" varchar,
	"onboarding_completed" boolean DEFAULT false,
	"onboarding_steps" jsonb DEFAULT '{"step1_operation":false,"step2_shopify":false,"step3_shipping":false,"step4_ads":false,"step5_sync":false}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "voice_calls" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" varchar NOT NULL,
	"twilio_call_sid" text NOT NULL,
	"twilio_account_sid" text,
	"direction" text NOT NULL,
	"from_number" text NOT NULL,
	"to_number" text NOT NULL,
	"status" text NOT NULL,
	"customer_name" text,
	"customer_email" text,
	"customer_phone" text,
	"duration" integer,
	"start_time" timestamp,
	"end_time" timestamp,
	"ai_response_generated" boolean DEFAULT false,
	"conversation_summary" text,
	"detected_intent" text,
	"satisfaction_level" text,
	"related_ticket_id" varchar,
	"category_id" varchar,
	"recording_url" text,
	"transcription" text,
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "voice_calls_twilio_call_sid_unique" UNIQUE("twilio_call_sid")
);
--> statement-breakpoint
CREATE TABLE "voice_conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" varchar NOT NULL,
	"type" text NOT NULL,
	"speaker" text NOT NULL,
	"content" text NOT NULL,
	"audio_url" text,
	"timestamp" timestamp NOT NULL,
	"duration" integer,
	"confidence" numeric(5, 4),
	"sentiment" text,
	"emotion" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "voice_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" varchar NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"twilio_phone_number" text,
	"operating_hours" jsonb DEFAULT '{"monday":{"enabled":true,"start":"09:00","end":"18:00"},"tuesday":{"enabled":true,"start":"09:00","end":"18:00"},"wednesday":{"enabled":true,"start":"09:00","end":"18:00"},"thursday":{"enabled":true,"start":"09:00","end":"18:00"},"friday":{"enabled":true,"start":"09:00","end":"18:00"},"saturday":{"enabled":false,"start":"09:00","end":"18:00"},"sunday":{"enabled":false,"start":"09:00","end":"18:00"},"timezone":"Europe/Madrid"}'::jsonb,
	"voice_model" text DEFAULT 'alloy',
	"language" text DEFAULT 'pt',
	"max_call_duration" integer DEFAULT 600,
	"fallback_to_human" boolean DEFAULT true,
	"human_fallback_number" text,
	"out_of_hours_message" text DEFAULT 'Nosso horário de atendimento é de segunda a sexta, das 9h às 18h. Deixe sua mensagem que retornaremos em breve.',
	"out_of_hours_action" text DEFAULT 'voicemail',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "ad_accounts" ADD CONSTRAINT "ad_accounts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_accounts" ADD CONSTRAINT "ad_accounts_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_creatives" ADD CONSTRAINT "ad_creatives_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_directives" ADD CONSTRAINT "ai_directives_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_analyses" ADD CONSTRAINT "creative_analyses_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creative_analyses" ADD CONSTRAINT "creative_analyses_creative_id_ad_creatives_id_fk" FOREIGN KEY ("creative_id") REFERENCES "public"."ad_creatives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_support_categories" ADD CONSTRAINT "customer_support_categories_operation_id_customer_support_operations_operation_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."customer_support_operations"("operation_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_support_emails" ADD CONSTRAINT "customer_support_emails_operation_id_customer_support_operations_operation_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."customer_support_operations"("operation_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_support_emails" ADD CONSTRAINT "customer_support_emails_ticket_id_customer_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."customer_support_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_support_emails" ADD CONSTRAINT "customer_support_emails_category_id_customer_support_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."customer_support_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_support_messages" ADD CONSTRAINT "customer_support_messages_operation_id_customer_support_operations_operation_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."customer_support_operations"("operation_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_support_messages" ADD CONSTRAINT "customer_support_messages_ticket_id_customer_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."customer_support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_support_messages" ADD CONSTRAINT "customer_support_messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_support_operations" ADD CONSTRAINT "customer_support_operations_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_support_tickets" ADD CONSTRAINT "customer_support_tickets_operation_id_customer_support_operations_operation_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."customer_support_operations"("operation_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_support_tickets" ADD CONSTRAINT "customer_support_tickets_category_id_customer_support_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."customer_support_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_support_tickets" ADD CONSTRAINT "customer_support_tickets_assigned_agent_id_users_id_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_metrics" ADD CONSTRAINT "dashboard_metrics_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_metrics" ADD CONSTRAINT "dashboard_metrics_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facebook_ads_integrations" ADD CONSTRAINT "facebook_ads_integrations_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_integrations" ADD CONSTRAINT "fulfillment_integrations_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_tax_calculations" ADD CONSTRAINT "investment_tax_calculations_investor_id_users_id_fk" FOREIGN KEY ("investor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_transactions" ADD CONSTRAINT "investment_transactions_investment_id_investments_id_fk" FOREIGN KEY ("investment_id") REFERENCES "public"."investments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_transactions" ADD CONSTRAINT "investment_transactions_investor_id_users_id_fk" FOREIGN KEY ("investor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_transactions" ADD CONSTRAINT "investment_transactions_pool_id_investment_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."investment_pools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_transactions" ADD CONSTRAINT "investment_transactions_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investments" ADD CONSTRAINT "investments_investor_id_users_id_fk" FOREIGN KEY ("investor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investments" ADD CONSTRAINT "investments_pool_id_investment_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."investment_pools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investor_profiles" ADD CONSTRAINT "investor_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_ad_spend" ADD CONSTRAINT "manual_ad_spend_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "manual_ad_spend" ADD CONSTRAINT "manual_ad_spend_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operations" ADD CONSTRAINT "operations_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_transaction_id_investment_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."investment_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_investor_id_users_id_fk" FOREIGN KEY ("investor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pool_performance_history" ADD CONSTRAINT "pool_performance_history_pool_id_investment_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."investment_pools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_contracts" ADD CONSTRAINT "product_contracts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_contracts" ADD CONSTRAINT "product_contracts_supplier_id_users_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_contracts" ADD CONSTRAINT "product_contracts_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_users_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_providers" ADD CONSTRAINT "shipping_providers_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_providers" ADD CONSTRAINT "shipping_providers_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopify_integrations" ADD CONSTRAINT "shopify_integrations_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payment_items" ADD CONSTRAINT "supplier_payment_items_payment_id_supplier_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."supplier_payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payment_items" ADD CONSTRAINT "supplier_payment_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_supplier_id_users_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_conversations" ADD CONSTRAINT "support_conversations_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_conversations" ADD CONSTRAINT "support_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_emails" ADD CONSTRAINT "support_emails_category_id_support_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."support_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_responses" ADD CONSTRAINT "support_responses_category_id_support_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."support_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_email_id_support_emails_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."support_emails"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_category_id_support_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."support_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_payment_schedule" ADD CONSTRAINT "tax_payment_schedule_investor_id_users_id_fk" FOREIGN KEY ("investor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_payment_schedule" ADD CONSTRAINT "tax_payment_schedule_calculation_id_investment_tax_calculations_id_fk" FOREIGN KEY ("calculation_id") REFERENCES "public"."investment_tax_calculations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_operation_access" ADD CONSTRAINT "user_operation_access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_operation_access" ADD CONSTRAINT "user_operation_access_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_products" ADD CONSTRAINT "user_products_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_products" ADD CONSTRAINT "user_products_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_products" ADD CONSTRAINT "user_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_calls" ADD CONSTRAINT "voice_calls_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_calls" ADD CONSTRAINT "voice_calls_related_ticket_id_support_tickets_id_fk" FOREIGN KEY ("related_ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_calls" ADD CONSTRAINT "voice_calls_category_id_support_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."support_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_conversations" ADD CONSTRAINT "voice_conversations_call_id_voice_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."voice_calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_settings" ADD CONSTRAINT "voice_settings_operation_id_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_directives_operation_id_index" ON "ai_directives" USING btree ("operation_id");--> statement-breakpoint
CREATE INDEX "ai_directives_type_index" ON "ai_directives" USING btree ("type");--> statement-breakpoint
CREATE INDEX "ai_directives_is_active_index" ON "ai_directives" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "customer_support_categories_operation_id_name_index" ON "customer_support_categories" USING btree ("operation_id","name");--> statement-breakpoint
CREATE INDEX "customer_support_emails_operation_id_index" ON "customer_support_emails" USING btree ("operation_id");--> statement-breakpoint
CREATE INDEX "customer_support_emails_message_id_index" ON "customer_support_emails" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "customer_support_emails_ticket_id_index" ON "customer_support_emails" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "customer_support_emails_status_index" ON "customer_support_emails" USING btree ("status");--> statement-breakpoint
CREATE INDEX "customer_support_emails_received_at_index" ON "customer_support_emails" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "customer_support_messages_ticket_id_index" ON "customer_support_messages" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "customer_support_messages_operation_id_index" ON "customer_support_messages" USING btree ("operation_id");--> statement-breakpoint
CREATE INDEX "customer_support_messages_sender_index" ON "customer_support_messages" USING btree ("sender");--> statement-breakpoint
CREATE INDEX "customer_support_messages_created_at_index" ON "customer_support_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "customer_support_messages_email_message_id_index" ON "customer_support_messages" USING btree ("email_message_id");--> statement-breakpoint
CREATE INDEX "customer_support_operations_email_domain_index" ON "customer_support_operations" USING btree ("email_domain");--> statement-breakpoint
CREATE INDEX "customer_support_tickets_operation_id_index" ON "customer_support_tickets" USING btree ("operation_id");--> statement-breakpoint
CREATE INDEX "customer_support_tickets_customer_email_index" ON "customer_support_tickets" USING btree ("customer_email");--> statement-breakpoint
CREATE INDEX "customer_support_tickets_status_index" ON "customer_support_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "customer_support_tickets_assigned_agent_id_index" ON "customer_support_tickets" USING btree ("assigned_agent_id");--> statement-breakpoint
CREATE INDEX "customer_support_tickets_created_at_index" ON "customer_support_tickets" USING btree ("created_at");