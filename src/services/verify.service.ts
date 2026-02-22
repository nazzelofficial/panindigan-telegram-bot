// use global fetch provided by Node 18+
import logger from '../logger';

const VERIFY_URL = process.env.API_VERIFY_URL || 'https://api.panindigan.com/verify';
const INSTANCE_ID = process.env.INSTANCE_ID || process.env.HOSTNAME || null;

let verified = false;
let lastResponse: any = null;

export function isVerified() {
  return verified;
}

async function doVerify() {
  if (!INSTANCE_ID) {
    logger.warn('INSTANCE_ID not set; skipping remote verification (defaults to disabled).');
    verified = false;
    return;
  }
  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instance_id: INSTANCE_ID })
    });
    if (!res.ok) {
      logger.warn(`Verification request failed: ${res.status} ${res.statusText}`);
      verified = false;
      lastResponse = { ok: false, status: res.status };
      return;
    }
    const json = await res.json();
    lastResponse = json;
    verified = !!json.allowed;
    logger.info(`Remote verification: allowed=${verified}` + (json.message ? ` msg=${json.message}` : ''));
  } catch (err) {
    verified = false;
    logger.error('Verification check failed: ' + (err as Error).message);
  }
}

export async function startVerificationLoop(intervalMs = 60_000) {
  await doVerify();
  setInterval(() => doVerify().catch((e) => logger.error('verify loop error: ' + (e as Error).message)), intervalMs);
}

export function getLastVerificationResponse() {
  return lastResponse;
}

export default {
  isVerified,
  startVerificationLoop,
  getLastVerificationResponse,
};
