import { Suspense } from "react";
import LibraryView from "../../../components/app/LibraryView";

export const metadata = { title: "Library" };

export default function Page() {
  return (
    <Suspense>
      <LibraryView />
    </Suspense>
  );
}
