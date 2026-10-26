# Frontend rules

- Type evolving database query responses at their call sites with local domain interfaces; never edit generated integration types to accommodate newer fields, so legacy query fallbacks remain compatible.

- Keep public privacy and account-deletion pages in the existing public information-page module and register them outside authentication guards and native website redirects, so the same legal content is accessible on the website and in the native app.