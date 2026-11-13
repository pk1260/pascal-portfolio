import { z } from "astro/zod";
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";

const projectCategory = z.enum(["web", "mobile", "desktop", "backend", "research", "full-stack"]);
const projectStatus = z.enum(["completed", "in-progress", "planned"]);

const githubRepo = z
  .url({
    protocol: /^https$/,
    hostname: /^github\.com$/,
  })
  .optional();

const projectSchema = z.object({
  title: z.string(),
  description: z.string(),
  technologies: z.array(z.string()),
  category: projectCategory,
  status: projectStatus,
  github: githubRepo,
  website: z.url().optional(),
  download: z.url().optional(),
  demo: z.url().optional(),
  order: z.number().int().positive(),
});

const projectCollection = defineCollection({
  loader: glob({
    base: "./src/content/projects",
    pattern: "**/*.mdx",
  }),
  schema: ({ image }) =>
    projectSchema.extend({
      cover: image(),
      gallery: z.array(image()).optional(),
    }),
});

export const collections = {
  projects: projectCollection,
};
