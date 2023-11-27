import { defineConfig } from 'vitepress'

const websiteDomain = process.env['WEBSITE_DOMAIN'] ?? 'eternagame.org';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "EternaScript Documentation",
  description: "EternaScript Documentation",
  cleanUrls: true,
  base: '/eternascript/',
  lastUpdated: true,
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    editLink: {
      pattern: 'https://github.com/eternagame/eternajs/edit/master/docs/eternascript/:path',
      text: 'Suggest changes to this page',
    },

    search: {
      provider: 'local'
    },

    nav: [
      { text: 'Eterna', link: `https://${websiteDomain}` },
      { text: 'Scripts', link: `https://${websiteDomain}/scripts` },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/eternagame/eternajs/docs/eternascript' }
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
        ]
      },
      {
        text: 'Reference',
        items: [
          { text: 'Utility APIs', link: '/reference/utility-apis' },
          { text: 'Booster APIs', link: '/reference/booster-apis' },
        ]
      }
    ],

    outline: 'deep',
  }
})
