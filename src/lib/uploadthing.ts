import { createUploadthing } from 'uploadthing/next'
import type { FileRouter } from 'uploadthing/next'

const f = createUploadthing()

export const ourFileRouter = {
  wardrobeImage: f({ image: { maxFileSize: '8MB', maxFileCount: 1 } })
    .middleware(async () => {
      return {}
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
