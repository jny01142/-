// Stores a device's Web Push subscription so the scheduled function can
// deliver reminders to it later, even while the app is fully closed.
const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { deviceId, subscription } = JSON.parse(event.body || '{}');
    if (!deviceId || !subscription) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Missing deviceId or subscription' }) };
    }
    const store = getStore('push-subscriptions');
    await store.setJSON(deviceId, subscription);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String(err) }) };
  }
};
