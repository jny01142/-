// Runs on a schedule (see netlify.toml) rather than in response to a
// request. This is the piece that lets a reminder arrive even if nobody
// has the app open — the OS/browser's push service wakes the device's
// service worker directly.
const { getStore } = require('@netlify/blobs');
const webpush = require('web-push');

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:noreply@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

exports.handler = async () => {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('VAPID keys are not set as environment variables — skipping this run.');
    return { statusCode: 200, body: 'skipped: VAPID keys not configured' };
  }

  const dataStore = getStore('lecture-data');
  const subStore = getStore('push-subscriptions');

  const { blobs } = await dataStore.list();
  const now = Date.now();
  let sentCount = 0;

  for (const { key: deviceId } of blobs) {
    let record;
    try {
      record = await dataStore.get(deviceId, { type: 'json' });
    } catch (e) {
      continue;
    }
    if (!record || !record.notifSettings || !record.notifSettings.h24) continue;

    let subscription;
    try {
      subscription = await subStore.get(deviceId, { type: 'json' });
    } catch (e) {
      continue;
    }
    if (!subscription) continue;

    const sentIds = record.sentIds || {};
    let changed = false;

    for (const lecture of record.lectures || []) {
      if (lecture.completed) continue;
      if (sentIds[lecture.id]) continue;

      const endAt = new Date(lecture.endAt).getTime();
      if (Number.isNaN(endAt)) continue;

      const remindAt = endAt - TWENTY_FOUR_HOURS_MS;
      const isDue = now >= remindAt && now < endAt;
      if (!isDue) continue;

      const payload = JSON.stringify({
        title: '온라인 강좌 마감이 하루 남았습니다.',
        body: `${lecture.subject} · ${lecture.week}${lecture.session ? ' ' + lecture.session : ''}`,
        url: './index.html'
      });

      try {
        await webpush.sendNotification(subscription, payload);
        sentIds[lecture.id] = true;
        changed = true;
        sentCount++;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // The subscription is dead (uninstalled, permission revoked, etc.) — drop it.
          await subStore.delete(deviceId);
          break;
        }
        console.error('push send failed for', deviceId, lecture.id, err.statusCode || err);
      }
    }

    if (changed) {
      record.sentIds = sentIds;
      await dataStore.setJSON(deviceId, record);
    }
  }

  return { statusCode: 200, body: `ok: ${sentCount} reminder(s) sent` };
};
