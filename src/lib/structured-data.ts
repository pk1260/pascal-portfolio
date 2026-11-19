import type { CollectionEntry } from "astro:content";
import type {
  BreadcrumbList,
  CollectionPage,
  ContactPage,
  CreativeWork,
  Person,
  ProfilePage,
  WebSite,
  WithContext,
} from "schema-dts";

export function createPersonSchema(site: URL): WithContext<Person> {
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

export function createWebsiteSchema(site: URL): WithContext<WebSite> {
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

export function createProfilePageSchema(site: URL): WithContext<ProfilePage> {
  const baseURL = site.href.replace(/\/$/, "");
  const pageURL = `${baseURL}/about/`;

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${pageURL}#profile`,
    url: pageURL,
    name: "About Pascal Kuiper",
    mainEntity: {
      "@id": `${baseURL}/#person`,
    },
    isPartOf: {
      "@id": `${baseURL}/#website`,
    },
  };
}

export function createProjectSchema(
  site: URL,
  project: CollectionEntry<"projects">,
): WithContext<CreativeWork> {
  const baseURL = site.href.replace(/\/$/, "");
  const pageURL = `${baseURL}/projects/${project.id}/`;

  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": `${pageURL}#project`,
    name: project.data.title.trim(),
    description: project.data.description.trim(),
    url: pageURL,
    image: `${baseURL}/og/${project.id}.png`,
    author: {
      "@id": `${baseURL}/#person`,
    },
    keywords: project.data.technologies,
    mainEntityOfPage: {
      "@id": pageURL,
    },
    isPartOf: {
      "@id": `${baseURL}/#website`,
    },
  };
}

export function createProjectBreadcrumbSchema(
  site: URL,
  project: CollectionEntry<"projects">,
): WithContext<BreadcrumbList> {
  const baseURL = site.href.replace(/\/$/, "");
  const pageURL = `${baseURL}/projects/${project.id}/`;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${pageURL}#breadcrumb`,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${baseURL}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Work",
        item: `${baseURL}/projects/`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: project.data.title.trim(),
        item: pageURL,
      },
    ],
  };
}

export function createWorkPageSchema(site: URL): WithContext<CollectionPage> {
  const baseURL = site.href.replace(/\/$/, "");
  const pageURL = `${baseURL}/projects/`;

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${pageURL}#collection`,
    name: "Software Engineering Projects",
    description: "A collection of software engineering projects by Pascal Kuiper.",
    url: pageURL,
    creator: {
      "@id": `${baseURL}/#person`,
    },
    isPartOf: {
      "@id": `${baseURL}/#website`,
    },
  };
}

export function createContactPageSchema(site: URL): WithContext<ContactPage> {
  const baseURL = site.href.replace(/\/$/, "");
  const pageURL = `${baseURL}/contact/`;

  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "@id": `${pageURL}#contact`,
    name: "Contact Pascal Kuiper",
    url: pageURL,
    about: {
      "@id": `${baseURL}/#person`,
    },
    isPartOf: {
      "@id": `${baseURL}/#website`,
    },
  };
}
