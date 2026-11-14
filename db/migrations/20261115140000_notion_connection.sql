-- Notion is connected through Composio. The person's connection id is sealed in user_integrations like Zoho's and Google's tokens, and
-- `meta.imported` remembers which Notion pages already became notes so importing again does not add copies.
alter table public.user_integrations drop constraint if exists user_integrations_provider_check;
alter table public.user_integrations add constraint user_integrations_provider_check check (provider in ('zoho', 'google', 'notion'));
alter table public.integration_oauth_states drop constraint if exists integration_oauth_states_provider_check;
alter table public.integration_oauth_states add constraint integration_oauth_states_provider_check check (provider in ('zoho', 'google', 'notion'));
