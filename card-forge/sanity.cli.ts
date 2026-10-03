import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  app: {
    // The organization that owns the VulnDex project (not a secret; it's in Dashboard URLs).
    organizationId: 'olfg8l2pc',
    entry: './src/App.tsx',
    title: 'Card Forge',
    icon: './icon.svg',
  },
  // Tailwind 4 via Vite, extending the built-in config as the App SDK docs describe.
  vite: async (viteConfig) => {
    const {default: tailwindcss} = await import('@tailwindcss/vite')
    return {...viteConfig, plugins: [...(viteConfig.plugins ?? []), tailwindcss()]}
  },
})
