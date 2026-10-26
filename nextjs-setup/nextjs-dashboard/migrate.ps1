$env:DATABASE_URL = "postgresql://neondb_owner:pn94vbcd@ep-weather-12345678-us-east-2.aws.neon.tech/neondb?sslmode=direct"
& npx prisma migrate dev --name init