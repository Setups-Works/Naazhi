# features/home

**Does:** the top of Home and drag-to-reorder for its cards (`components/app/HomeView.tsx`).

**Layout of Home:** a dashboard, deliberately not a second chat start page. A date-led header (greeting and plan above, the date as the title, a one-line summary of overdue / left today / due this week / journal today), then **`QuickAdd.tsx`**: a one-line bar that adds a to-do for today or a journal entry (drafts `home:task` and `journal:<today>`, the latter shared with the Journal page) and an "Ask Naazhi" button to the chat page. QuickAdd calls Home's existing task and journal actions. Cards can switch it to a mode (`QuickAddHandle.open`). Then the daily tip and the cards.

**The cards:** main column `today` ("Your day": `ProgressRing.tsx` with today's progress beside overdue and due-today tasks; one line with "Add a to-do" when clear) and `recent` ("Jump back in": recent notes, chats and today's journal entries with All / Notes / Chats / Journal filters, built by the tested `recent.ts`). Side column `schedule` ("Up next": today's events and this week's deadlines as a timeline), `journal` (the last seven days as a strip and the streak, from the tested `journalWeek.ts`; reads entry dates only), `health`, `reader`, `insights` (compact: the top three traits as bars, the radar behind "Show all eight traits"). Empty states are one quiet line with the next step, never a tall empty box.

**Cards:** Each column (`main`, `side`) keeps its own order, saved in this browser under `up_home_layout` (not in the database: it is a per-device layout, so no migration).

**Files:** `useHomeLayout.ts` (the order, saving, pointer drag, arrow-key moves) · `DragHandle.tsx` (the grip). The pure part — cleaning a saved order against the cards that exist and moving an item — is `packages/logic/src/homeLayout.ts` (tested), shared with the phone app.

**How it works:** a card swaps with its neighbour when the pointer passes the neighbour's midpoint (never on mere overlap, so a tall card can't make two cards swap back and forth). The handle is a real `<button>` with `touch-none`; focus it and press ↑ / ↓ to move a card without a pointer.

**Rules**

- Add a card: put its id in `HOME_COLUMNS` and add it to the `cards` map in `HomeView`; old saved orders pick it up at the end automatically (`cleanOrder`). A card that renders `null` (like invitations when there are none) is skipped but keeps its place.
- Each card's wrapper needs `data-drag-id` (HomeView's `column()` adds it); the column needs `data-home-col`.
- No auto-scroll while dragging near the screen edge yet.
- Phone app equivalent: `apps/mobile/src/features/home` + `components/ui/ReorderableList.tsx` (the grip on each card, then drag).
