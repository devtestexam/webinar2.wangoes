/*
 * Centralized submission helper — the ONLY place that talks to the
 * Google Apps Script webhook. Every form/CTA on the site calls
 * submitLead() instead of writing its own fetch() call.
 *
 * There is no application server here (static HTML + nginx), so this
 * calls the Apps Script URL directly from the browser. That URL is
 * necessarily public in that scenario (visible in the network tab /
 * page source) — it comes from window.WANGOES_CONFIG.SCRIPT_URL, which
 * is generated at deploy time from NEXT_PUBLIC_SCRIPT_URL by
 * scripts/generate-config.js and is never hardcoded in tracked source.
 *
 * Uses a text/plain body so the request stays a CORS "simple request"
 * (no preflight) — this is the standard pattern for calling Apps
 * Script Web Apps from the browser. See README/Apps Script notes for
 * the required doPost() shape.
 *
 * CTA click events (source: "cta") are additionally, in parallel,
 * fire-and-forgot to the n8n webhook at
 * window.WANGOES_CONFIG.N8N_CTA_WEBHOOK_URL (from
 * NEXT_PUBLIC_N8N_CTA_WEBHOOK_URL, same config.js generation as above).
 * This is a real JSON POST (not the text/plain trick) since n8n's
 * Webhook node expects application/json — the n8n webhook must have
 * CORS enabled for this site's origin for the browser call to succeed.
 * n8n failures never affect the Apps Script submission's result.
 */
(function (global) {
  'use strict';

  function sendToN8nCta(payload) {
    var cfg = global.WANGOES_CONFIG || {};
    var url = cfg.N8N_CTA_WEBHOOK_URL;
    if (!url) return;

    global.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(function () { /* fire-and-forget — never surfaced to the visitor */ });
  }

  function submitLead(fields) {
    var cfg = global.WANGOES_CONFIG || {};
    var url = cfg.SCRIPT_URL;

    if (!url) {
      return Promise.reject(new Error('Missing Apps Script URL (config.js not generated — run scripts/generate-config.js)'));
    }

    var utm = global.WANGOES_UTM || {};

    var utmVal = utm.utm || '';
    var utmSourceVal = utm.utmSource || utm.utm_source || utmVal;

    var payload = {};
    var base = {
      page: global.location.pathname,
      timestamp: new Date().toISOString(),
      userAgent: global.navigator ? global.navigator.userAgent : '',
      utm: utmVal,
      utmSource: utmSourceVal,
      utm_source: utmSourceVal,
      utmMedium: utm.utmMedium || utm.utm_medium || '',
      utmCampaign: utm.utmCampaign || utm.utm_campaign || '',
      utmTerm: utm.utmTerm || utm.utm_term || '',
      utmContent: utm.utmContent || utm.utm_content || ''
    };

    // Always include utm, utmSource, utm_source in payload (even if empty string),
    // and include other base metadata if non-empty.
    Object.keys(base).forEach(function (key) {
      if (key === 'utm' || key === 'utmSource' || key === 'utm_source' || base[key]) {
        payload[key] = base[key];
      }
    });
    Object.keys(fields || {}).forEach(function (key) {
      if (fields[key] !== undefined && fields[key] !== null && fields[key] !== '') {
        payload[key] = fields[key];
      }
    });

    // Forward all submission events to n8n for automation tracking
    sendToN8nCta(payload);

    return global.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.json()
        .catch(function () { return {}; })
        .then(function (data) {
          if (!res.ok || data.success === false) {
            throw new Error((data && data.message) || 'Submission failed');
          }
          return data;
        });
    });
  }

  global.submitLead = submitLead;
})(window);
