-- Google (Gmail, Calendar, Drive) is connected with our own Google sign-in instead of through Composio: the person's tokens are sealed in
-- user_integrations like Zoho's, so those tables accept the provider 'google', and the Composio connection tables are no longer used.
alter table public.user_integrations drop constraint if exists user_integrations_provider_check;
alter table public.user_integrations add constraint user_integrations_provider_check check (provider in ('zoho', 'google'));
alter table public.integration_oauth_states drop constraint if exists integration_oauth_states_provider_check;
alter table public.integration_oauth_states add constraint integration_oauth_states_provider_check check (provider in ('zoho', 'google'));
drop table if exists public.integration_events;
drop table if exists public.integration_connections;
