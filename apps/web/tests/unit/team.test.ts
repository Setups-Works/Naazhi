import { describe, expect, it } from "vitest";
import { teamPersonId, teamSchemas, type TeamPerson } from "../../src/lib/seo";
import { teamMemberInput } from "../../src/server/services/team/team.schema";

const person: TeamPerson = {
  slug: "asha-rao",
  name: "Asha Rao",
  role: "Founder",
  bio: "Builds calm software.",
  photoUrl: "https://example.com/asha.jpg",
  links: [{ label: "LinkedIn", url: "https://www.linkedin.com/in/asha" }],
};

describe("teamSchemas", () => {
  const docs = teamSchemas([person]).filter((d): d is Record<string, unknown> => d !== undefined);
  const byType = (t: string) => docs.filter((d) => d["@type"] === t);

  it("describes the page as an AboutPage about Naazhi's organization", () => {
    const [about] = byType("AboutPage");
    expect(about?.["@id"]).toMatch(/\/team#page$/);
    expect(about?.mainEntity).toEqual({ "@id": expect.stringMatching(/\/#organization$/) });
  });

  it("gives each person an id, job title, picture, profile links and an employer", () => {
    const [p] = byType("Person");
    expect(p?.["@id"]).toBe(teamPersonId("asha-rao"));
    expect(p?.jobTitle).toBe("Founder");
    expect(p?.sameAs).toEqual(["https://www.linkedin.com/in/asha"]);
    expect(p?.image).toEqual({ "@type": "ImageObject", url: "https://example.com/asha.jpg" });
    expect(p?.worksFor).toEqual({ "@id": expect.stringMatching(/\/#organization$/) });
  });

  it("lists the people as employees of the organization and adds a breadcrumb", () => {
    const [org] = byType("Organization");
    expect(org?.employee).toEqual([{ "@id": teamPersonId("asha-rao") }]);
    expect(byType("BreadcrumbList")).toHaveLength(1);
  });

  it("leaves out fields the admin left empty instead of inventing them", () => {
    const [p] = teamSchemas([{ ...person, bio: "", photoUrl: null, links: [] }]).filter((d) => d?.["@type"] === "Person");
    expect(p).not.toHaveProperty("description");
    expect(p).not.toHaveProperty("image");
    expect(p).not.toHaveProperty("sameAs");
  });
});

describe("teamMemberInput", () => {
  const ok = { slug: "Asha-Rao", name: " Asha Rao ", role: "Founder" };

  it("trims, lowercases the URL name and fills defaults", () => {
    const r = teamMemberInput.parse(ok);
    expect(r).toMatchObject({ slug: "asha-rao", name: "Asha Rao", bio: "", photoUrl: "", links: [], sortOrder: 0, published: true });
  });

  it("rejects a URL name that is not url-safe", () => {
    expect(teamMemberInput.safeParse({ ...ok, slug: "asha rao!" }).success).toBe(false);
  });

  it("accepts only https photo and profile addresses", () => {
    expect(teamMemberInput.safeParse({ ...ok, photoUrl: "http://example.com/a.jpg" }).success).toBe(false);
    expect(teamMemberInput.safeParse({ ...ok, photoUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(teamMemberInput.safeParse({ ...ok, links: [{ label: "Site", url: "ftp://x.com" }] }).success).toBe(false);
    expect(teamMemberInput.safeParse({ ...ok, links: [{ label: "Site", url: "https://example.com" }] }).success).toBe(true);
  });

  it("limits the links and the bio", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ label: `L${i}`, url: "https://example.com" }));
    expect(teamMemberInput.safeParse({ ...ok, links: many }).success).toBe(false);
    expect(teamMemberInput.safeParse({ ...ok, bio: "x".repeat(1001) }).success).toBe(false);
  });
});
