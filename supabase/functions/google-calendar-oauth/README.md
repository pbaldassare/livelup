# google-calendar-oauth

Edge Function for PT Google Calendar OAuth (connect / disconnect / status / callback).

## Secrets (Lovable Cloud → Edge Functions secrets)

| Secret | Required | Description |
|---|---|---|
| `GOOGLE_CLIENT_ID` | ✅ | OAuth 2.0 Client ID (Google Cloud Console → APIs & Services → Credentials) |
| `GOOGLE_CLIENT_SECRET` | ✅ | OAuth 2.0 Client Secret |
| `GOOGLE_REDIRECT_URI` | optional | Defaults to `{SUPABASE_URL}/functions/v1/google-calendar-oauth?action=callback` |
| `APP_ORIGIN` | optional | Post-OAuth redirect origin. Default: `https://livelapp.iaconnect.it` |

Also available automatically: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## Google Cloud Console setup

1. Enable **Google Calendar API** for the project.
2. Create OAuth client type **Web application**.
3. Authorized redirect URI (exact match):

```
https://uiowzycolsmgcsvihmhy.supabase.co/functions/v1/google-calendar-oauth?action=callback
```

4. Authorized JavaScript origins (if prompted): your app origins (`https://livelapp.iaconnect.it`, preview URLs).

## JWT

`verify_jwt = false` in `supabase/config.toml` — required so Google's browser redirect to `?action=callback` works without a user JWT. `start` / `disconnect` / `status` still validate the Bearer JWT inside the function.

## Related

- Sync events: `google-calendar-sync` (create / update / delete Google events for appuntamenti).
- Table: `public.pt_google_calendar_connections` (tokens only via `service_role`).
