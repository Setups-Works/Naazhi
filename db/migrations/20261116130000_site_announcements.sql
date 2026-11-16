-- Announcements can also be shown as a bar at the top of the public website, controlled from Admin → Announcements.
-- placement: where it shows ('app' = signed-in app only, as before; 'site' = public website only; 'both'). An optional link (a path on
-- this site or an https address) gives the bar a button. The website reads it through the server, so no public database access is added.
alter table public.announcements add column if not exists placement text not null default 'app' check (placement in ('app', 'site', 'both'));
alter table public.announcements add column if not exists link_label text check (link_label is null or char_length(link_label) between 1 and 40);
alter table public.announcements add column if not exists link_href text check (link_href is null or (char_length(link_href) <= 300 and (link_href ~ '^/[^/\\]' or link_href ~ '^https://')));
