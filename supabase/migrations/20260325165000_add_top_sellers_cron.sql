-- 1. Add is_top_seller column to products table if not exists
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_top_seller BOOLEAN DEFAULT false;

-- 2. Create the RPC function to determine the top 2 best-selling products per company
CREATE OR REPLACE FUNCTION public.update_top_selling_products()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Reset current top sellers safely
    UPDATE public.products SET is_top_seller = false;

    -- Set new top sellers based on last 24h sales volume
    WITH product_sales AS (
        SELECT 
            pr.company_id,
            (item->>'id')::uuid AS product_id,
            SUM((item->>'qty')::numeric) AS total_qty
        FROM 
            public.purchase_requests pr,
            jsonb_array_elements(pr.items) AS item
        WHERE 
            pr.status = 'completed'
            AND pr.type = 'earn' -- Consider only sales (earn operations generate earn points from purchase requests)
            AND pr.created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY 
            pr.company_id,
            (item->>'id')::uuid
    ),
    ranked_sales AS (
        SELECT 
            company_id,
            product_id,
            total_qty,
            ROW_NUMBER() OVER(PARTITION BY company_id ORDER BY total_qty DESC) as rnk
        FROM 
            product_sales
    )
    UPDATE public.products p
    SET is_top_seller = true
    FROM ranked_sales rs
    WHERE p.id = rs.product_id AND rs.rnk <= 2;
END;
$$;

-- 3. Enable pg_cron (requires database instance that supports it, Supabase does)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 4. Schedule the job to run daily at 05:00 UTC (02:00 BRT) and 17:00 UTC (14:00 BRT)
-- Re-create if it already exists by unscheduling first (optional but safe pattern)
SELECT cron.unschedule('update_top_sellers_daily') FROM pg_class WHERE relname='cron.job' AND EXISTS (SELECT 1 FROM cron.job WHERE jobname='update_top_sellers_daily');

SELECT cron.schedule(
    'update_top_sellers_daily',
    '0 5,17 * * *',
    'SELECT public.update_top_selling_products();'
);
