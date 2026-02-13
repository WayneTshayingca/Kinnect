-- Add unique constraint on auth_user_id to prevent duplicate auth linkages.
-- NULL values are allowed (placeholder users without accounts), and
-- PostgreSQL UNIQUE permits multiple NULLs by default.

ALTER TABLE public.users
ADD CONSTRAINT users_auth_user_id_unique UNIQUE (auth_user_id);
