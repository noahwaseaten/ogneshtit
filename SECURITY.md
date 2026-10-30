# Security

Please do not open a public issue for security problems. Report them privately through
[GitHub's private vulnerability reporting](https://github.com/noahwaseaten/ogneshtit/security/advisories/new).

The Щит apps (ОгнеЩит, ВодоЩит and the hub) have no accounts and store no personal data on the server beyond
anonymous push subscriptions (the browser's push endpoint and a place rounded to about 1 km). The API routes only
proxy public sources (Open-Meteo, GloFAS, NASA FIRMS, ИАГ, MeteoAlarm, АППД) and cache their answers.
Secrets live only in the Vercel project settings: `FIRMS_MAP_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET` and the Blob token.
