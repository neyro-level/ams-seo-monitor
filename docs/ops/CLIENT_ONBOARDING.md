# CLIENT ONBOARDING

## Статус

Wave 1 reserves the onboarding contract only. Live onboarding starts later.

## Planned initial order

1. REDACTED_CLIENT_DATA REDACTED_CLIENT_DATA;
2. SZ REDACTED_CLIENT_DATA;
3. REDACTED_CLIENT_DATA Volchevsk after confirmed production inputs;
4. REDACTED_CLIENT_DATA REDACTED_CLIENT_DATA after confirmed production inputs.

## Required facts per site

- exact site URL;
- exact Webmaster verified host;
- accessible Metrica counter;
- timezone;
- goal allowlist;
- client auth delivery method.

## Rules

- do not infer one client credentials from another;
- disabled planned sites stay visible as `Не подключён`;
- onboarding must not change route architecture;
- onboarding must not expose OAuth, counter IDs or file paths in browser payload.

## Wave 1 foundation already prepared

- registry-driven client and site routes;
- planned-site state;
- fixture snapshot DTO;
- separate private SourceCraft repo.
