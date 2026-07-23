# Medicine Dispenser Stack

A React Native (Expo) mobile app backed by a Spring Boot API and a Neon Postgres database.

## Structure

```
medicine-dispenser/
├── mobile/          # Expo React Native app
├── server/          # Spring Boot backend (JPA + PostgreSQL)
├── prisma/          # Prisma schema / migrations for Neon Postgres
└── .env.example     # Copy to .env and fill in your secrets
```

## Setup

1. **Copy the environment template**
   ```bash
   cp .env.example .env
   # edit .env with your Neon DATABASE_URL
   ```

2. **Install & run the backend**
   ```bash
   cd server
   export $(cat ../.env | xargs)
   mvn spring-boot:run
   ```
   The API will be available at `http://localhost:8080/api/medicines`.

3. **Install & run the mobile app**
   ```bash
   cd mobile
   npm install
   npx expo start
   ```
   Update `API_BASE` in `mobile/App.tsx` to match your backend URL.

4. **Run Prisma migrations (optional)**
   Prisma is included for schema design and as a migration tool for Neon.
   ```bash
   cd prisma
   npm install
   export DATABASE_URL=$(cat ../.env | grep DATABASE_URL | cut -d '=' -f2-)
   npx prisma migrate dev --name init
   ```
   If you want Prisma to own migrations, change `spring.jpa.hibernate.ddl-auto` in `server/src/main/resources/application.yml` from `update` to `validate` after the initial migration.

## Notes

- Spring Boot connects to Neon via the `DATABASE_URL` env var. The `application.yml` prepends `jdbc:` to the standard `postgresql://` connection string.
- Prisma and Spring Boot cannot share a runtime ORM; Prisma is used here for managing the Postgres schema/migrations while the API uses Spring Data JPA.
