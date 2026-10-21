-- 20261021115500_fix_auth_seed_token_nulls.sql
--
-- SPEC 09 — Fix: el login con password devolvía 500 en Supabase Auth.
-- El seed de SPEC 01 insertó el usuario directamente en auth.users y dejó
-- las columnas token de GoTrue en NULL. GoTrue las escanea como string
-- no-nulo y falla TODO login: "error finding user: sql: Scan error on
-- column confirmation_token: converting NULL to string is unsupported".
-- Fix oficial: normalizar NULL a '' (default que GoTrue espera).
-- Docs: https://supabase.com/docs/guides/troubleshooting/scan-error-on-column-confirmation_token-converting-null-to-string-is-unsupported-during-auth-login-a0c686

update auth.users
set confirmation_token = coalesce(confirmation_token, ''),
    recovery_token = coalesce(recovery_token, ''),
    email_change = coalesce(email_change, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    phone_change = coalesce(phone_change, ''),
    phone_change_token = coalesce(phone_change_token, ''),
    reauthentication_token = coalesce(reauthentication_token, '')
where confirmation_token is null
   or recovery_token is null
   or email_change is null
   or email_change_token_new is null
   or email_change_token_current is null
   or phone_change is null
   or phone_change_token is null
   or reauthentication_token is null;
