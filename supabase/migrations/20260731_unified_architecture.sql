-- Migration: Unified Architecture for Analytics and Fidelity
-- Date: 2026-07-31

-- 1. Ensure store_id column in loyalty_transactions for origin tracking
ALTER TABLE public.loyalty_transactions 
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Backfill store_id for existing rows where store_id is NULL
UPDATE public.loyalty_transactions
SET store_id = user_id
WHERE store_id IS NULL;

-- 2. Function to get all accessible store IDs for a user based on QRIDO hierarchy
-- ADMIN -> HOLDING -> GRUPO -> LOJA
CREATE OR REPLACE FUNCTION public.get_accessible_store_ids(p_user_id UUID)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role TEXT;
    v_company_type TEXT;
    v_accessible_store_ids UUID[];
BEGIN
    IF p_user_id IS NULL THEN
        RETURN ARRAY[]::UUID[];
    END IF;

    -- Get user role and company_type from profiles
    SELECT role, company_type INTO v_role, v_company_type
    FROM public.profiles
    WHERE id = p_user_id;

    -- 1. ADMIN: sees all active stores
    IF v_role = 'admin' THEN
        SELECT ARRAY_AGG(id) INTO v_accessible_store_ids
        FROM public.profiles
        WHERE (company_type = 'store' OR role = 'company')
          AND (is_active IS NULL OR is_active = true);

    -- 2. HOLDING: sees all stores belonging to groups accepted/active under this holding
    ELSIF v_role = 'holding' OR v_company_type = 'holding' THEN
        SELECT ARRAY_AGG(DISTINCT cg.store_id) INTO v_accessible_store_ids
        FROM public.holding_groups hg
        JOIN public.company_groups cg ON cg.mall_id = hg.group_id
        WHERE hg.holding_id = p_user_id
          AND hg.status IN ('accepted', 'active')
          AND cg.status = 'accepted';

    -- 3. GRUPO (MALL): sees all stores accepted under this group
    ELSIF v_role = 'group' OR v_role = 'mall' OR v_company_type = 'mall' THEN
        SELECT ARRAY_AGG(DISTINCT store_id) INTO v_accessible_store_ids
        FROM public.company_groups
        WHERE mall_id = p_user_id
          AND status = 'accepted';

    -- 4. LOJA / COMPANY / STAFF: sees only own store_id
    ELSIF v_role = 'company_staff' THEN
        DECLARE
            v_comp_id UUID;
        BEGIN
            SELECT company_id INTO v_comp_id FROM public.profiles WHERE id = p_user_id;
            v_accessible_store_ids := ARRAY[COALESCE(v_comp_id, p_user_id)];
        END;
    ELSE
        v_accessible_store_ids := ARRAY[p_user_id];
    END IF;

    IF v_accessible_store_ids IS NULL THEN
        v_accessible_store_ids := ARRAY[]::UUID[];
    END IF;

    RETURN v_accessible_store_ids;
END;
$$;

-- 3. Update get_holding_analytics function to utilize unified get_accessible_store_ids
CREATE OR REPLACE FUNCTION public.get_holding_analytics(
    p_holding_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_group_id UUID DEFAULT NULL,
    p_store_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_target_store_ids UUID[];
    v_result JSONB;
BEGIN
    IF p_store_id IS NOT NULL THEN
        v_target_store_ids := ARRAY[p_store_id];
    ELSIF p_group_id IS NOT NULL THEN
        SELECT ARRAY_AGG(DISTINCT store_id) INTO v_target_store_ids
        FROM public.company_groups
        WHERE mall_id = p_group_id
          AND status = 'accepted';
    ELSE
        v_target_store_ids := public.get_accessible_store_ids(p_holding_id);
    END IF;

    IF v_target_store_ids IS NULL THEN
        v_target_store_ids := ARRAY[]::UUID[];
    END IF;

    WITH daily_stats AS (
        SELECT 
            DATE(lt.created_at AT TIME ZONE 'UTC') AS stat_date,
            COALESCE(SUM(lt.sale_amount), 0) AS total_sales,
            COALESCE(SUM(CASE WHEN lt.type = 'earn' THEN lt.points ELSE 0 END), 0) AS points_earned,
            COALESCE(SUM(CASE WHEN lt.type = 'redeem' THEN lt.points ELSE 0 END), 0) AS points_redeemed,
            COUNT(DISTINCT lt.id) AS total_transactions,
            COUNT(DISTINCT lt.customer_id) AS active_customers
        FROM public.loyalty_transactions lt
        WHERE COALESCE(lt.store_id, lt.user_id) = ANY(v_target_store_ids)
          AND lt.user_id = ANY(v_target_store_ids)
          AND lt.created_at >= p_start_date
          AND lt.created_at <= p_end_date
        GROUP BY DATE(lt.created_at AT TIME ZONE 'UTC')
    ),
    summary AS (
        SELECT 
            COALESCE(SUM(total_sales), 0) AS grand_total_sales,
            COALESCE(SUM(points_earned), 0) AS grand_points_earned,
            COALESCE(SUM(points_redeemed), 0) AS grand_points_redeemed,
            COALESCE(SUM(total_transactions), 0) AS grand_total_transactions,
            COALESCE(COUNT(DISTINCT stat_date), 0) AS active_days
        FROM daily_stats
    ),
    store_rankings AS (
        SELECT 
            p.id AS store_id,
            p.full_name AS store_name,
            COALESCE(SUM(lt.sale_amount), 0) AS total_sales,
            COUNT(DISTINCT lt.id) AS total_transactions
        FROM public.profiles p
        LEFT JOIN public.loyalty_transactions lt 
               ON COALESCE(lt.store_id, lt.user_id) = p.id
              AND lt.user_id = p.id
              AND lt.created_at >= p_start_date 
              AND lt.created_at <= p_end_date
        WHERE p.id = ANY(v_target_store_ids)
        GROUP BY p.id, p.full_name
        ORDER BY total_sales DESC
    )
    SELECT jsonb_build_object(
        'summary', (SELECT row_to_json(s.*) FROM summary s),
        'daily', COALESCE((SELECT jsonb_agg(d.* ORDER BY d.stat_date ASC) FROM daily_stats d), '[]'::jsonb),
        'stores', COALESCE((SELECT jsonb_agg(sr.*) FROM store_rankings sr), '[]'::jsonb)
    ) INTO v_result;

    RETURN v_result;
END;
$$;
