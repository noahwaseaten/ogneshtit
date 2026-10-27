# Security

Please do not open a public issue for security problems. Report them privately through
[GitHub's private vulnerability reporting](https://github.com/noahwaseaten/ogneshtit/security/advisories/new).

ОгнеЩит has no accounts and stores no personal data on the server. The API routes only proxy
public sources (Open-Meteo, NASA FIRMS, ИАГ, MeteoAlarm) and cache their answers.
The one secret is `FIRMS_MAP_KEY`, which lives only in the Vercel project settings.
