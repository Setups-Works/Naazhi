# features/home (app)

**Does:** the Home screen, laid out like the web Home: greeting with the plan badge, a quick-action row, then Today (progress and add-a-task), today's journal (write an entry), Notes, Chats, Schedule, Reader, Health, the journal streak and personality insights. Every card has the web's **grip handle**: press it and drag the card up or down (screen readers get Move up / Move down). The order is saved per account on the phone (`AsyncStorage`, key `home-layout:<user id>`).

**Files:** `HomeScreen.tsx` (builds a `sections` map of `(handle) => card` functions and hands it to `ReorderableList`) · `HomePanel.tsx` (the glass panel: icon chip, title, Open, grip) · `useHomeOrder.ts` (`HOME_SECTIONS` default order, load and save) · `components/ui/ReorderableList.tsx` (the drag: a `react-native-gesture-handler` pan on the grip after a 120 ms touch + `react-native-reanimated`; no new dependency). Cleaning and moving the order is `packages/logic/src/homeLayout.ts`, shared with the web.

**Rules**

- Add a section: add its id to `HOME_SECTIONS`, an entry to `sections` and a name to `LABELS` in `HomeScreen`; render the `handle` it is given in the card's header; saved orders pick it up at the end.
- A section whose node is `null` is skipped (the `plans` card is `null` once a plan is chosen).
- The short touch on the grip keeps scrolling working when a finger slides down the page; the cards themselves are not draggable, so taps and text fields stay normal.
- Honour "Reduce motion" (the rows skip their slide animation).
- There is no auto-scroll while dragging near the screen edge yet. Not yet verified on a physical device: try it on iOS and Android after changing the list.
