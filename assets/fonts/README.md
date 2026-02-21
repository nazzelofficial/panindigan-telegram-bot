Fonts directory for Panindigan bot

Place any custom font files here (TTF/OTF) used by the welcome/goodbye renderer.
Recommended filenames and usage:

- assets/fonts/Inter-Regular.ttf
- assets/fonts/Inter-Bold.ttf

In `config.json` set `welcome.font_family` to the filename (without path) or update `renderWelcomeCard()` to reference the font path `assets/fonts/<name>`.

Do not commit large commercial fonts to the repository; consider mounting them at runtime instead.

This repository automatically downloads the Inter font into `assets/fonts` during the Docker builder stage (Inter is licensed under the SIL Open Font License). If you prefer to provide your own fonts, replace files in this directory or mount a volume at `/app/assets/fonts`.
