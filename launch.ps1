docker compose up -d
npx pm2 start ecosystem.config.js
cd client
pnpm run dev