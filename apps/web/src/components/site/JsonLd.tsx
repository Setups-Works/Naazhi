/**
 * Puts schema.org structured data in the page as JSON-LD. Pass one document or several; `undefined` entries are skipped. The JSON is
 * escaped so no value can close the script tag.
 */
export default function JsonLd({ data }: { data: (object | undefined) | (object | undefined)[] }) {
  const docs = (Array.isArray(data) ? data : [data]).filter((d): d is object => d !== undefined);
  return (
    <>
      {docs.map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(d).replace(/</g, "\\u003c") }} />
      ))}
    </>
  );
}
