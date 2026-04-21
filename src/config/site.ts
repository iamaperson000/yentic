export const site = {
  name: 'Yentic',
  marketingUrl: 'https://yentic.com',
  contactEmail: 'hello@yentic.com',
  githubUrl: 'https://github.com/iamaperson000/yentic'
} as const;

export type SiteConfig = typeof site;
