export const site = {
  name: 'Yentic',
  marketingUrl: 'https://yentic.com',
  contactEmail: 'hello@yentic.com'
} as const;

export type SiteConfig = typeof site;
