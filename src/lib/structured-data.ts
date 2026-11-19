export function createPersonSchema(site: URL) {
  const baseURL = site.href.replace(/\/$/, "");

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${baseURL}/#person`,
    name: "Pascal Kuiper",
    url: `${baseURL}/`,
    jobTitle: "Software Engineer",
    sameAs: ["https://github.com/pk1260", "https://www.linkedin.com/in/pascalkuiper"],
  };
}

export function createWebsiteSchema(site: URL) {
  const baseURL = site.href.replace(/\/$/, "");

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${baseURL}/#website`,
    url: `${baseURL}/`,
    name: "Pascal Kuiper",
    description: "Personal portfolio of Pascal Kuiper, Software Engineer.",
    creator: {
      "@id": `${baseURL}/#person`,
    },
  };
}
