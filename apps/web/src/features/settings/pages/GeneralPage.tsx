"use client";
import { Switch } from "@/components/ui/switch";
import { CATEGORIES } from "../../../lib/notes";
import type { Prefs } from "../../../lib/prefs";
import { SettingsRow, SettingsSection } from "../ui";
import { usePrefsSave } from "../usePrefsSave";

const SELECT = "h-9 rounded-ctl border bg-raised px-3 text-[14px] text-ink outline-none focus-visible:border-line-3";

/** General: how dates and defaults behave, and what Home shows. Rows with the control on the right, like the other pages. */
export default function GeneralPage({ prefs: initial }: { prefs: Prefs }) {
  const { prefs, change, error } = usePrefsSave(initial);
  return (
    <>
      <SettingsSection title="Preferences">
        <SettingsRow title="Time format" description="How times are shown across the app.">
          <select className={SELECT} aria-label="Time format" value={prefs.timeFormat} onChange={(e) => change({ timeFormat: e.target.value as Prefs["timeFormat"] })}>
            <option value="12h">12-hour (9:46 pm)</option>
            <option value="24h">24-hour (21:46)</option>
          </select>
        </SettingsRow>
        <SettingsRow title="Week starts on" description="Used by calendars and week views.">
          <select className={SELECT} aria-label="Week starts on" value={prefs.weekStart} onChange={(e) => change({ weekStart: e.target.value as Prefs["weekStart"] })}>
            <option value="mon">Monday</option>
            <option value="sun">Sunday</option>
          </select>
        </SettingsRow>
        <SettingsRow title="Default category for new notes" description="Where a new note goes until you pick another.">
          <select className={SELECT} aria-label="Default category for new notes" value={prefs.defaultCategory} onChange={(e) => change({ defaultCategory: e.target.value })}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </SettingsRow>
        <SettingsRow title="Open the To-do page on" description="The view you land on when you open To-do.">
          <select className={SELECT} aria-label="Open the To-do page on" value={prefs.todoView} onChange={(e) => change({ todoView: e.target.value as Prefs["todoView"] })}>
            <option value="today">Today</option>
            <option value="inbox">Inbox</option>
            <option value="upcoming">Upcoming</option>
          </select>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Home">
        <SettingsRow title="Tips on Home" description="A short tip about something you may not have tried yet, at most one a day.">
          <Switch checked={prefs.homeTips} onCheckedChange={(v) => change({ homeTips: v })} aria-label="Tips on Home" />
        </SettingsRow>
        <SettingsRow title="Announcements on Home" description="News about new features. Notices about your account always show.">
          <Switch checked={prefs.homeAnnouncements} onCheckedChange={(v) => change({ homeAnnouncements: v })} aria-label="Announcements on Home" />
        </SettingsRow>
      </SettingsSection>
      {error && (
        <p className="form-err" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
