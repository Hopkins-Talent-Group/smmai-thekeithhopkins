import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // NOTE: Do NOT list @prisma/client here.
  // Prisma 7 uses a custom output at src/generated/prisma (see prisma/schema.prisma).
  // Externalizing @prisma/client makes Turbopack try to load
  // `.prisma/client/default`, which doesn't exist with a custom output
  // under pnpm — that is exactly the "Failed to load external module
  // @prisma/client / Cannot find module '.prisma/client/default'" crash
  // you saw on POST /api/auth/login.
  // The Neon HTTP adapter has no native binary, so bundling is safe.
  serverExternalPackages: [],
};

export default nextConfig;