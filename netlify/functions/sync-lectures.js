// Stores a device's current lecture list + notification settings. The
// scheduled function reads this to decide who is due a reminder.
// `sentIds` (which lectures already got a server-sent push) is preserved
// across syncs so a reminder is never sent twice for the same lecture.
const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { deviceId, lectures, notifSettings } = JSON.parse(event.body || '{}');
    if (!deviceId) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Missing deviceId' }) };
    }
    const store = getStore('lecture-data');

    let prev = null;
    try { prev = await store.get(deviceId, { type: 'json' }); } catch (e) { /* first sync for this device */ }
    const sentIds = (prev && prev.sentIds) || {};

    await store.setJSON(deviceId, {
      lectures: lectures || [],
      notifSettings: notifSettings || {},
      sentIds,
      updatedAt: new Date().toISOString()
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String(err) }) };
  }
};
