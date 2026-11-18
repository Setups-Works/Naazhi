# features/review (app)

**Does:** shows Google Play's own in-app review card (`expo-store-review`, which wraps the Play In-App Review API) at a good moment, and gives Settings a "Rate Naazhi on Google Play" button. Android only: there is no App Store listing yet.

```
features/review/
  reviewPrompt.ts   counters on the phone (AsyncStorage `naazhi.review.v1`), notePositiveMoment(), useReviewSessions(), openPlayReviews()
packages/logic/src/reviewPrompt.ts   the timing rules (tested in reviewPrompt.test.ts)
```

**When the card may appear** (`REVIEW_RULES`): at least 3 days after the first open, at least 5 separate visits, and enough good moments since the last ask (8, then 25, then 60 points; a finished task or a new note is 1, a journal entry 2, a streak 3). Then it waits 120 days between asks and stops after 3. It is requested 1.2 seconds after the moment, only while the app is on screen.

**Good moments are counted in:** `tasks/queries.ts` (completing a task), `journal/queries.ts` (a new entry), `notes/queries.ts` (a new note). Visits are counted in the root layout for signed-in people. To add a moment, call `notePositiveMoment(kind)` after the action succeeded.

**Google's rules (don't break them):**

- Never trigger the card from a button or a menu: Play has a hidden quota and may show nothing, which looks broken. Buttons use `openPlayReviews()` (the Play listing's reviews).
- Never ask a question before or while the card shows ("Enjoying Naazhi?", "Would you give us 5 stars?"), and never put anything over or around it.
- Never reward a review.

**Testing:** the card only appears in builds installed from Google Play (internal testing track or later); a sideloaded or debug build and Expo Go show nothing. Play may also hold it back because of its quota. To try the rules sooner, lower the numbers in `REVIEW_RULES` locally; don't ship that.

**Web and desktop:** no equivalent. The card is a Play Store feature, and the website and desktop app are not installed from Play.
