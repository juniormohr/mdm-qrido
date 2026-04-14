-- Fix missing uuid-ossp extension in public schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
