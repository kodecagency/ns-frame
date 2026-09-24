import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

// Las guías viven en /docs (una sola fuente para GitHub y para el sitio)
const docs = defineCollection({
  loader: glob({ pattern: ['*.md', '!README.md'], base: '../../docs' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number(),
  }),
})

export const collections = { docs }
