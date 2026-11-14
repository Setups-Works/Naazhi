export type Task = {
  id: string;
  title: string;
  description: string;
  priority: 1 | 2 | 3 | 4 | 5;
  /** First day of a task that spans several days; due_date is the last. */
  start_date?: string | null;
  list_id: string | null;
  due_date: string | null;
  done: boolean;
  done_at: string | null;
  cancelled: boolean;
  archived: boolean;
  recurrence: string | null;
  /** Time of day (HH:MM or HH:MM:SS) to be reminded on the due date; null for none. */
  remind_time?: string | null;
  parent_id?: string | null;
  created_at: string;
};
export type TaskList = { id: string; name: string; color: string; created_at: string };
export type Entry = {
  id: string;
  entry_date: string;
  body: string;
  created_at: string;
  updated_at: string;
  kind: "text" | "voice";
  attachments: Attachment[];
  share_token?: string | null;
};
export type Attachment = { path: string; name: string; type: string; size: number };
export type Note = {
  id: string;
  title: string;
  body: string;
  updated_at: string;
  created_at: string;
  category: string;
  pinned: boolean;
  kind: "text" | "voice";
  sort_order: number;
  attachments: Attachment[];
  color: string | null;
  /** The folder the note is filed in, or null. */
  folder_id: string | null;
  labels: string[];
  /** When the note was moved to the Trash; null for a note that is not in the Trash. */
  deleted_at: string | null;
  /** The secret in the note's public link; null while the note is private. */
  share_token: string | null;
};
export type NoteVersion = { id: string; title: string; body: string; created_at: string };
export type Chat = {
  id: string;
  title: string;
  updated_at: string;
  pinned: boolean;
  folder_id: string | null;
  last_read_at: string;
  share_token: string | null;
};
export type ChatFolder = { id: string; name: string };
export type Message = { id: string; role: "user" | "assistant"; body: string; created_at: string; attachments: Attachment[] };
export type Profile = { plan: string };
export type CalendarEvent = {
  id: string;
  external_id: string | null;
  calendar_id: string;
  title: string;
  description: string;
  location: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  color: string;
  created_at: string;
  updated_at: string;
};
