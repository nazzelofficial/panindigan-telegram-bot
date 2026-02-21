import path from 'path';
import fs from 'fs';

export function assetPath(...parts: string[]) {
  const p = path.resolve(process.cwd(), 'assets', ...parts);
  return p;
}

export function defaultBackground() {
  const candidates = [
    assetPath('backgrounds', 'default_background.svg'),
    assetPath('backgrounds', 'hero1.svg'),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

export function defaultAvatar() {
  const candidates = [
    assetPath('defaults', 'default_avatar.png'),
    assetPath('defaults', 'default_avatar.svg'),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

export function findFirstFont() {
  const fontsDir = assetPath('fonts');
  try {
    const files = fs.readdirSync(fontsDir);
    for (const f of files) {
      if (/\.ttf$|\.otf$/i.test(f)) return path.join(fontsDir, f);
    }
  } catch {}
  return null;
}
