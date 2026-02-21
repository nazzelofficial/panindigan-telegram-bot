import sharp from "sharp";
import fs from "fs";

let createCanvas: any;
let loadImage: any;
const tryRequire = (name: string) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(name);
  }
  catch (e) {
    return null;
  }
};
const canvasModule = tryRequire('@napi-rs/canvas') || tryRequire('canvas');
if (!canvasModule) {
  throw new Error('No canvas implementation found. Install @napi-rs/canvas or canvas.');
}
createCanvas = canvasModule.createCanvas;
loadImage = canvasModule.loadImage;

export async function renderWelcomeCard(options: {
  backgroundPath?: string;
  avatarBuffer?: Buffer;
  name: string;
  group: string;
  count?: number;
  textColor?: string;
}) {
  const width = 1000;
  const height = 400;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // background
  if (options.backgroundPath && fs.existsSync(options.backgroundPath)) {
    const bg = await loadImage(options.backgroundPath);
    ctx.drawImage(bg, 0, 0, width, height);
  } else {
    ctx.fillStyle = '#2b2b2b';
    ctx.fillRect(0, 0, width, height);
  }

  // overlay
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(0, 0, width, height);

  // avatar
  if (options.avatarBuffer) {
    const avatarImg = await loadImage(options.avatarBuffer as any);
    const avSize = 200;
    const avX = 60;
    const avY = (height - avSize) / 2;
    // circle mask
    ctx.save();
    ctx.beginPath();
    ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatarImg, avX, avY, avSize, avSize);
    ctx.restore();
  }

  // text
  ctx.fillStyle = options.textColor || '#FFFFFF';
  ctx.font = 'bold 36px Sans';
  ctx.fillText(options.name, 300, 180);
  ctx.font = '24px Sans';
  ctx.fillText(options.group, 300, 220);
  if (typeof options.count === 'number') {
    ctx.fillText(`Member #${options.count}`, 300, 260);
  }

  const buffer = canvas.toBuffer('image/png');
  // optimize with sharp
  const out = await sharp(buffer).png().toBuffer();
  return out;
}
