CREATE TABLE IF NOT EXISTS big_arena_warehouse_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id varchar NOT NULL REFERENCES user_warehouse_accounts(id) ON DELETE CASCADE,
    user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    operation_id varchar REFERENCES operations(id),
    api_token text NOT NULL,
    api_domain text,
    status text NOT NULL DEFAULT 'active',
    last_sync_at timestamp,
    last_sync_status text DEFAULT 'never',
    last_sync_cursor text,
    last_sync_error text,
    metadata jsonb,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now(),
    CONSTRAINT big_arena_warehouse_accounts_account_id_unique UNIQUE (account_id)
);

CREATE INDEX IF NOT EXISTS big_arena_warehouse_accounts_user_idx
    ON big_arena_warehouse_accounts (user_id);

CREATE INDEX IF NOT EXISTS big_arena_warehouse_accounts_operation_idx
    ON big_arena_warehouse_accounts (operation_id);

CREATE INDEX IF NOT EXISTS big_arena_warehouse_accounts_status_idx
    ON big_arena_warehouse_accounts (status);

INSERT INTO warehouse_providers (id, key, name, description, required_fields, is_active)
VALUES (
    gen_random_uuid(),
    'big_arena',
    'Big Arena Logistics',
    'Integração oficial Big Arena para pedidos, estoque e logística.',
    jsonb_build_array(
        jsonb_build_object(
            'fieldName', 'apiToken',
            'fieldType', 'password',
            'label', 'API Token',
            'placeholder', 'seu_token_api',
            'required', true
        ),
        jsonb_build_object(
            'fieldName', 'domain',
            'fieldType', 'text',
            'label', 'Domínio (opcional)',
            'placeholder', 'ex: api.sualoja.bigarena.com',
            'required', false
        )
    ),
    true
)
ON CONFLICT (key) DO UPDATE
SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    required_fields = EXCLUDED.required_fields,
    is_active = true,
    updated_at = now();

