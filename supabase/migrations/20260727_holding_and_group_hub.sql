-- Migration for Holding (Admin de Grupos) and Group Hub (Agrupador de Lojas)
-- Date: 2026-07-27

-- 1. Update company_type constraint on public.profiles to support 'holding'
DO $$ 
BEGIN
    -- Drop existing check constraint if present
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_company_type_check;
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    
    -- Re-add check constraints including 'holding'
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_company_type_check 
    CHECK (company_type IN ('store', 'mall', 'holding'));

    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('company', 'customer', 'admin', 'holding'));
END $$;

-- Add holding_id column to profiles to directly link a group (mall) to a holding if needed
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS holding_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Create holding_groups table (Linking Holding to Groups/Malls)
CREATE TABLE IF NOT EXISTS public.holding_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    holding_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(holding_id, group_id)
);

-- Enable RLS on holding_groups
ALTER TABLE public.holding_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Holdings and groups can view their relationship" ON public.holding_groups
    FOR SELECT USING (auth.uid() = holding_id OR auth.uid() = group_id);

CREATE POLICY "Holdings can manage their groups" ON public.holding_groups
    FOR ALL USING (auth.uid() = holding_id);

-- 3. Add group_id to rewards to allow exclusive group rewards
ALTER TABLE public.rewards 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE POLICY "Public read rewards for active groups" ON public.rewards
    FOR SELECT USING (is_active = true);

-- 4. RPC Function to fetch holding metrics & daily heatmap data
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
    -- Determine target store IDs managed under this holding
    SELECT ARRAY_AGG(cg.store_id) INTO v_target_store_ids
    FROM public.holding_groups hg
    JOIN public.company_groups cg ON cg.mall_id = hg.group_id
    WHERE hg.holding_id = p_holding_id
      AND cg.status = 'accepted'
      AND (p_group_id IS NULL OR hg.group_id = p_group_id)
      AND (p_store_id IS NULL OR cg.store_id = p_store_id);

    -- Also include store_ids directly associated if group_id itself is a store
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
        WHERE lt.user_id = ANY(v_target_store_ids)
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
               ON lt.user_id = p.id 
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
