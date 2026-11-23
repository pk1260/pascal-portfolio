import { expect, test } from "@playwright/test";

const SITE_URL = "https://pascal-kuiper.nl";

interface Schema {
  "@context": string;
  "@type": string;
  "@id"?: string;
  name?: string;
  url?: string;
  mainEntity?: {
    "@type": string;
    "@id": string;
    name: string;
    url?: string;
    jobTitle?: string;
    sameAs?: string[];
  };
  itemListElement?: {
    "@type": string;
    position: number;
    name: string;
    item: string;
  }[];
}

async function getSchemas(page: import("@playwright/test").Page): Promise<Schema[]> {
  return page.locator('script[type="application/ld+json"]').evaluateAll((scripts) =>
    scripts.flatMap((script) => {
      const value = JSON.parse(script.textContent ?? "null");
      return Array.isArray(value) ? value : [value];
    }),
  );
}

test.describe("Structured data", () => {
  test("homepage includes Person and WebSite schemas", async ({ page }) => {
    await page.goto("/");

    const schemas = await getSchemas(page);

    expect(schemas.map((schema) => schema["@type"])).toEqual(["Person", "WebSite"]);

    const person = schemas.find((schema) => schema["@type"] === "Person");
    const website = schemas.find((schema) => schema["@type"] === "WebSite");

    expect(person?.["@id"]).toBe(`${SITE_URL}/#person`);
    expect(person?.name).toBe("Pascal Kuiper");

    expect(website?.["@id"]).toBe(`${SITE_URL}/#website`);
    expect(website?.url).toBe(`${SITE_URL}/`);
  });

  test("about page includes a valid ProfilePage with a Person entity", async ({ page }) => {
    await page.goto("/about/");

    const schemas = await getSchemas(page);
    const profile = schemas.find((schema) => schema["@type"] === "ProfilePage");

    expect(profile).toBeDefined();
    expect(profile?.["@id"]).toBe(`${SITE_URL}/about/#profile`);
    expect(profile?.url).toBe(`${SITE_URL}/about/`);

    expect(profile?.mainEntity).toMatchObject({
      "@type": "Person",
      "@id": `${SITE_URL}/#person`,
      name: "Pascal Kuiper",
      url: `${SITE_URL}/`,
      jobTitle: "Software Engineer",
    });

    expect(profile?.mainEntity?.sameAs).toEqual([
      "https://github.com/pk1260",
      "https://www.linkedin.com/in/pascalkuiper",
    ]);
  });

  for (const project of [
    { id: "dingdong", name: "Dingdong" },
    { id: "vrcafe", name: "VRcafe Haarlem Website" },
    { id: "flightcompanion", name: "FlightCompanion" },
  ]) {
    test(`${project.name} includes CreativeWork and breadcrumbs`, async ({ page }) => {
      await page.goto(`/projects/${project.id}/`);

      const schemas = await getSchemas(page);
      const work = schemas.find((schema) => schema["@type"] === "CreativeWork");
      const breadcrumbs = schemas.find((schema) => schema["@type"] === "BreadcrumbList");

      expect(work).toBeDefined();
      expect(work?.["@id"]).toBe(`${SITE_URL}/projects/${project.id}/#project`);
      expect(work?.name).toBe(project.name);

      expect(breadcrumbs).toBeDefined();
      expect(breadcrumbs?.itemListElement).toEqual([
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: `${SITE_URL}/`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Work",
          item: `${SITE_URL}/projects/`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: project.name,
          item: `${SITE_URL}/projects/${project.id}/`,
        },
      ]);
    });
  }

  test("work page includes CollectionPage structured data", async ({ page }) => {
    await page.goto("/projects/");

    const schemas = await getSchemas(page);
    const collection = schemas.find((schema) => schema["@type"] === "CollectionPage");

    expect(collection).toBeDefined();
    expect(collection?.["@id"]).toBe(`${SITE_URL}/projects/#collection`);
    expect(collection?.url).toBe(`${SITE_URL}/projects/`);
    expect(collection?.name).toBe("Software Engineering Projects");
  });

  test("contact page includes ContactPage structured data", async ({ page }) => {
    await page.goto("/contact/");

    const schemas = await getSchemas(page);
    const contact = schemas.find((schema) => schema["@type"] === "ContactPage");

    expect(contact).toBeDefined();
    expect(contact?.["@id"]).toBe(`${SITE_URL}/contact/#contact`);
    expect(contact?.url).toBe(`${SITE_URL}/contact/`);
    expect(contact?.name).toBe("Contact Pascal Kuiper");
  });
});

test("structured data URLs match canonical URLs", async ({ page }) => {
  for (const path of [
    "/",
    "/about/",
    "/projects/",
    "/contact/",
    "/projects/dingdong/",
    "/projects/vrcafe/",
    "/projects/flightcompanion/",
  ]) {
    await page.goto(path);

    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    const schemas = await getSchemas(page);

    expect(canonical).toBe(`${SITE_URL}${path}`);

    for (const schema of schemas) {
      if (schema.url) {
        expect(schema.url).toBe(canonical);
      }
    }
  }
});

test("custom 404 page displays navigation without structured data", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist/");

  expect(response?.status()).toBe(404);

  await expect(page.getByRole("heading", { name: "Page not found." })).toBeVisible();

  await expect(
    page.getByText("The page you're looking for doesn't exist or may have moved."),
  ).toBeVisible();

  await expect(page.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");

  await expect(page.getByRole("link", { name: "Explore projects" })).toHaveAttribute(
    "href",
    "/projects",
  );

  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);

  await page.getByRole("link", { name: "Back to home" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page).not.toHaveURL(/this-page-does-not-exist/);
});

test("all pages contain expected structured data", async ({ page }) => {
  const routes = [
    { path: "/", types: ["Person", "WebSite"] },
    { path: "/about/", types: ["ProfilePage"] },
    { path: "/projects/", types: ["CollectionPage"] },
    { path: "/contact/", types: ["ContactPage"] },
    { path: "/projects/dingdong/", types: ["CreativeWork", "BreadcrumbList"] },
    { path: "/projects/vrcafe/", types: ["CreativeWork", "BreadcrumbList"] },
    { path: "/projects/flightcompanion/", types: ["CreativeWork", "BreadcrumbList"] },
  ];

  for (const route of routes) {
    await page.goto(route.path);

    const schemas = await getSchemas(page);

    expect(schemas.map((schema) => schema["@type"])).toEqual(route.types);

    for (const schema of schemas) {
      expect(schema["@context"]).toBe("https://schema.org");
      expect(schema["@id"]).toMatch(/^https:\/\/pascal-kuiper\.nl\//);
    }
  }
});
