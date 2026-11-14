-- A reminder time for a to-do: the time of day (the person's own clock) to be reminded on the task's due date. It is kept as a wall-clock
-- time, not an instant, so it stays right when the due date changes and when a repeating to-do moves to its next day. The phone app and
-- the desktop app work out the exact moment from the due date, in the person's own time zone, and deliver it themselves. A to-do with no
-- due date, or one that spans several days, simply has no reminder; the apps ignore the time there, so older apps can't break anything.

alter table public.tasks add column if not exists remind_time time;
