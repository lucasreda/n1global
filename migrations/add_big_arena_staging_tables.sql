CREATE TABLE IF NOT EXISTS big_arena_warehouses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    big_arena_account_id varchar NOT NULL REFERENCES big_arena_warehouse_accounts(id) ON DELETE CASCADE,
    warehouse_id text NOT NULL,
    name text,
    country text,
    city text,
    metadata jsonb,
    raw_data jsonb NOT NULL,
    synced_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT big_arena_warehouses_unique UNIQUE (big_arena_account_id, warehouse_id)
);

CREATE INDEX IF NOT EXISTS big_arena_warehouses_account_idx
    ON big_arena_warehouses (big_arena_account_id);

CREATE TABLE IF NOT EXISTS big_arena_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id varchar REFERENCES user_warehouse_accounts(id) ON DELETE SET NULL,
    big_arena_account_id varchar NOT NULL REFERENCES big_arena_warehouse_accounts(id) ON DELETE CASCADE,
    operation_id varchar REFERENCES operations(id),
    order_id text NOT NULL,
    external_id text,
    status text,
    total numeric(12,2),
    currency text,
    tracking_code text,
    tracking_url text,
    customer_name text,
    customer_phone text,
    customer_email text,
    shipping_address jsonb,
    billing_address jsonb,
    items jsonb,
    raw_data jsonb NOT NULL,
    processed_to_orders boolean NOT NULL DEFAULT false,
    linked_order_id text,
    processed_at timestamptz,
    order_date timestamptz,
    updated_at_remote timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT big_arena_orders_unique UNIQUE (big_arena_account_id, order_id)
);

CREATE INDEX IF NOT EXISTS big_arena_orders_unprocessed_idx
    ON big_arena_orders (processed_to_orders);
CREATE INDEX IF NOT EXISTS big_arena_orders_order_idx
    ON big_arena_orders (order_id);
CREATE INDEX IF NOT EXISTS big_arena_orders_account_idx
    ON big_arena_orders (big_arena_account_id);

CREATE TABLE IF NOT EXISTS big_arena_order_returns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    big_arena_account_id varchar NOT NULL REFERENCES big_arena_warehouse_accounts(id) ON DELETE CASCADE,
    order_return_id text NOT NULL,
    order_id text,
    status text,
    reason text,
    resolved boolean DEFAULT false,
    raw_data jsonb NOT NULL,
    processed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT big_arena_order_returns_unique UNIQUE (big_arena_account_id, order_return_id)
);

CREATE INDEX IF NOT EXISTS big_arena_returns_order_idx
    ON big_arena_order_returns (order_id);

CREATE TABLE IF NOT EXISTS big_arena_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    big_arena_account_id varchar NOT NULL REFERENCES big_arena_warehouse_accounts(id) ON DELETE CASCADE,
    product_id text NOT NULL,
    sku text,
    name text,
    status text,
    metadata jsonb,
    raw_data jsonb NOT NULL,
    synced_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT big_arena_products_unique UNIQUE (big_arena_account_id, product_id)
);

CREATE INDEX IF NOT EXISTS big_arena_products_sku_idx
    ON big_arena_products (sku);

CREATE TABLE IF NOT EXISTS big_arena_product_variants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    big_arena_account_id varchar NOT NULL REFERENCES big_arena_warehouse_accounts(id) ON DELETE CASCADE,
    product_id text NOT NULL,
    variant_id text NOT NULL,
    sku text,
    title text,
    barcode text,
    price numeric(12,2),
    inventory_quantity integer,
    raw_data jsonb NOT NULL,
    synced_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT big_arena_variants_unique UNIQUE (big_arena_account_id, variant_id)
);

CREATE INDEX IF NOT EXISTS big_arena_variants_product_idx
    ON big_arena_product_variants (product_id);
CREATE INDEX IF NOT EXISTS big_arena_variants_sku_idx
    ON big_arena_product_variants (sku);

CREATE TABLE IF NOT EXISTS big_arena_shipments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    big_arena_account_id varchar NOT NULL REFERENCES big_arena_warehouse_accounts(id) ON DELETE CASCADE,
    shipment_id text NOT NULL,
    order_id text,
    status text,
    carrier text,
    tracking_code text,
    tracking_url text,
    shipped_at timestamptz,
    delivered_at timestamptz,
    raw_data jsonb NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT big_arena_shipments_unique UNIQUE (big_arena_account_id, shipment_id)
);

CREATE INDEX IF NOT EXISTS big_arena_shipments_order_idx
    ON big_arena_shipments (order_id);

CREATE TABLE IF NOT EXISTS big_arena_couriers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    big_arena_account_id varchar NOT NULL REFERENCES big_arena_warehouse_accounts(id) ON DELETE CASCADE,
    courier_id text NOT NULL,
    name text,
    code text,
    raw_data jsonb NOT NULL,
    synced_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT big_arena_couriers_unique UNIQUE (big_arena_account_id, courier_id)
);

CREATE TABLE IF NOT EXISTS big_arena_courier_nomenclatures (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    big_arena_account_id varchar NOT NULL REFERENCES big_arena_warehouse_accounts(id) ON DELETE CASCADE,
    nomenclature_id text NOT NULL,
    courier_id text,
    name text,
    raw_data jsonb NOT NULL,
    synced_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT big_arena_courier_nomenclatures_unique UNIQUE (big_arena_account_id, nomenclature_id)
);

