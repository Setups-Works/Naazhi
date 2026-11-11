"use client";

/** Opens the browser's print dialog, where "Save as PDF" makes the invoice a file. */
export default function PrintButton() {
  return (
    <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>
      Print or save as PDF
    </button>
  );
}
