-- Events imported from Google Calendar carry their Google id in external_id. Importing again must update them, not add copies, so the
-- same event of the same calendar can exist once per person. Rows without an external_id (events made in Naazhi) are never in conflict.
create unique index if not exists calendar_events_user_cal_ext_uniq on public.calendar_events (user_id, calendar_id, external_id);
