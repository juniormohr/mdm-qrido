-- Enable earthdistance extension for fast geo calculations
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- Create addresses table
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    street TEXT,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(profile_id)
);

-- Turn on RLS
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies
CREATE POLICY "Addresses are viewable by everyone" ON public.addresses
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own address" ON public.addresses
    FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own address" ON public.addresses
    FOR UPDATE USING (auth.uid() = profile_id);

-- Create RPC for fetching nearby companies
CREATE OR REPLACE FUNCTION get_nearby_companies(
    user_lat DOUBLE PRECISION,
    user_lon DOUBLE PRECISION,
    radius_km DOUBLE PRECISION DEFAULT 50.0
)
RETURNS TABLE (
    company_id UUID,
    company_name TEXT,
    distance_km DOUBLE PRECISION,
    street TEXT,
    city TEXT,
    state TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as company_id,
        p.full_name as company_name,
        (point(a.longitude, a.latitude) <@> point(user_lon, user_lat)) * 1.60934 as distance_km,
        a.street,
        a.city,
        a.state
    FROM 
        public.profiles p
    INNER JOIN 
        public.addresses a ON p.id = a.profile_id
    WHERE 
        p.role = 'company'
        AND a.latitude IS NOT NULL
        AND a.longitude IS NOT NULL
        -- filter by radius (earthdistance point <@> point calculates in miles, hence * 1.60934)
        AND (point(a.longitude, a.latitude) <@> point(user_lon, user_lat)) * 1.60934 <= radius_km
    ORDER BY 
        distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
