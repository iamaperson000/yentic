export const site = {
  name: 'All in the Tab',
  marketingUrl: 'https://allinthetab.com',
  contactEmail: 'hello@allinthetab.com',
  githubUrl: 'https://github.com/allinthetab/allinthetab'
} as const;

export type SiteConfig = typeof site;
