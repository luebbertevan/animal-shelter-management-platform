# Migration File Naming Guidelines

## Issue

When creating new database migrations, it's critical to use valid timestamps that:

1. Come **after** the latest existing migration
2. Use the format: `YYYYMMDDHHMMSS_description.sql`
3. Are checked programmatically before creating new migrations

## Why This Keeps Happening

-   Migrations are ordered by filename (lexicographically)
-   Supabase uses migration timestamps to determine execution order
-   If a migration has a timestamp earlier than existing ones, it will be rejected or cause conflicts
-   Manual timestamp creation is error-prone

## Solution Process

### Before Creating a New Migration:

1. **Check the latest migration timestamp:**

    ```bash
    ls -1 supabase/migrations/ | sort -V | tail -1
    ```

2. **Get current timestamp:**

    ```bash
    date +"%Y%m%d%H%M%S"
    ```

3. **Use a timestamp that:**
    - Is **after** the latest migration (increment the time portion)
    - Uses format: `YYYYMMDDHHMMSS` (14 digits)
    - Example: If latest is `20251213180000`, use `20251213190000` or later

### Example:

-   Latest migration: `20251213180000_add_updated_at_trigger_for_animal_groups.sql`
-   New migration should be: `20251213190000_` or `20251215190000_` (any timestamp after)

## Best Practice

Always check the latest migration timestamp before creating a new migration file to ensure proper ordering.
