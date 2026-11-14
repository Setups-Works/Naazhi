import { describe, expect, it } from "vitest";
import { teamMemberDescription, teamMemberPath, teamMemberSchemas, teamPersonId, teamSchemas, wikidataIdOf, type TeamPerson } from "../../src/lib/seo";

const nitheesh: TeamPerson = {
  slug: "asha-kumar",
  name: "Asha Kumar",
  role: "Developer",
  bio: "",
  photoUrl: "https://example.com/n.jpg",
  links: [
    { label: "LinkedIn", url: "https://www.linkedin.com/in/asha-example" },
    { label: "GitHub", url: "https://github.com/example" },
  ],
  updatedAt: "2026-11-14T06:00:00.000Z",
};
const type = (docs: ReturnType<typeof teamMemberSchemas>, t: string) => docs.find((d) => d?.["@type"] === t) as Record<string, unknown>;

describe("team member structured data", () => {
  const docs = teamMemberSchemas(nitheesh);

  it("describes the page as a ProfilePage whose subject is the Person", () => {
    const page = type(docs, "ProfilePage");
    expect(page["@id"]).toMatch(/\/team\/asha-kumar#profile$/);
    expect(page.url).toMatch(/\/team\/asha-kumar$/);
    expect(page.mainEntity).toEqual({ "@id": teamPersonId("asha-kumar") });
    expect(page.dateModified).toBe("2026-11-14T06:00:00.000Z");
  });

  it("keeps the Person @id the Team page has always used, and ties it to the profile links", () => {
    const person = type(docs, "Person");
    expect(person["@id"]).toBe(teamPersonId("asha-kumar"));
    expect(person["@id"]).toMatch(/\/team#asha-kumar$/);
    expect(person.url).toMatch(/\/team\/asha-kumar$/);
    expect(person.sameAs).toEqual(["https://www.linkedin.com/in/asha-example", "https://github.com/example"]);
    expect(person.jobTitle).toBe("Developer");
    expect((person.image as { url: string }).url).toBe("https://example.com/n.jpg");
  });

  it("ends the breadcrumb on the person and states nothing that was not entered", () => {
    const crumb = type(docs, "BreadcrumbList") as { itemListElement: { name: string }[] };
    expect(crumb.itemListElement.map((i) => i.name)).toEqual(["Home", "Team", "Asha Kumar"]);
    const person = type(docs, "Person");
    expect(person.description).toBeUndefined(); // no bio entered, so none is invented
    expect(Object.keys(person)).not.toContain("birthDate");
  });

  it("omits sameAs and image when the person has none", () => {
    const person = type(teamMemberSchemas({ ...nitheesh, links: [], photoUrl: null }), "Person");
    expect(person.sameAs).toBeUndefined();
    expect(person.image).toBeUndefined();
  });

  it("is the same Person node the Team page lists", () => {
    const list = teamSchemas([nitheesh]).filter((d) => d?.["@type"] === "Person") as Record<string, unknown>[];
    expect(list[0]!["@id"]).toBe(type(docs, "Person")["@id"]);
    expect(list[0]!.url).toBe(type(docs, "Person").url);
  });
});

describe("team member description", () => {
  it("uses a short bio as it is, trims a long one at a word, and falls back to a plain sentence", () => {
    expect(teamMemberDescription({ name: "A", role: "B", bio: "Builds things." })).toBe("Builds things.");
    const long = teamMemberDescription({ name: "A", role: "B", bio: "word ".repeat(80) });
    expect(long.length).toBeLessThanOrEqual(156);
    expect(long.endsWith("…")).toBe(true);
    expect(teamMemberDescription({ name: "Asha", role: "Designer", bio: "" })).toContain("Asha is Designer at Naazhi");
  });
  it("gives each person a path from their slug", () => expect(teamMemberPath("asha-k")).toBe("/team/asha-k"));
});

describe("knowledge-panel facts", () => {
  const rich: TeamPerson = {
    ...base(),
    links: [{ label: "Wikidata", url: "https://www.wikidata.org/wiki/Q123456" }, { label: "GitHub", url: "https://github.com/asha" }],
    alternateNames: ["A. Kumar"],
    knowsAbout: ["Design systems", "Accessibility"],
    location: "Chennai, Tamil Nadu, India",
    alumniOf: "Example University",
    alumniUrl: "https://example.edu",
    awards: ["Example Award 2026"],
  };
  const person = () => type(teamMemberSchemas(rich), "Person");

  it("writes each fact an admin entered into the Person", () => {
    expect(person().alternateName).toEqual(["A. Kumar"]);
    expect(person().knowsAbout).toEqual(["Design systems", "Accessibility"]);
    expect(person().homeLocation).toEqual({ "@type": "Place", name: "Chennai, Tamil Nadu, India" });
    expect(person().alumniOf).toEqual({ "@type": "Organization", name: "Example University", url: "https://example.edu" });
    expect(person().award).toEqual(["Example Award 2026"]);
    expect(person().identifier).toEqual({ "@type": "PropertyValue", propertyID: "Wikidata", value: "Q123456" });
  });

  it("states none of them when none were entered", () => {
    const bare = type(teamMemberSchemas(base()), "Person");
    for (const k of ["alternateName", "knowsAbout", "homeLocation", "alumniOf", "award", "identifier"]) expect(bare[k], k).toBeUndefined();
  });

  it("finds the Wikidata id only on a wikidata.org item link", () => {
    expect(wikidataIdOf([{ url: "https://www.wikidata.org/wiki/Q42" }])).toBe("Q42");
    expect(wikidataIdOf([{ url: "https://wikidata.org/entity/q7/" }])).toBe("Q7");
    expect(wikidataIdOf([{ url: "https://example.com/wikidata.org/wiki/Q1" }, { url: "https://github.com/x" }])).toBeUndefined();
  });
});

function base(): TeamPerson {
  return { slug: "asha-kumar", name: "Asha Kumar", role: "Designer", bio: "", photoUrl: null, links: [] };
}
