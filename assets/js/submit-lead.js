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

    var payload = {};
    var base = {
      page: global.location.pathname,
      timestamp: new Date().toISOString(),
      userAgent: global.navigator ? global.navigator.userAgent : '',
      utmSource: utm.utmSource,
      utmMedium: utm.utmMedium,
      utmCampaign: utm.utmCampaign
    };

    // Merge base metadata first, then caller fields, then drop anything empty
    // so we never ship meaningless blank columns to the sheet.
    Object.keys(base).forEach(function (key) {
      if (base[key]) payload[key] = base[key];
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
