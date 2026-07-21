/*
 * Captures utm / utm_source / utm_medium / utm_campaign / utm_term / utm_content
 * from the URL on first touch and persists them in sessionStorage so they survive the
 * registration -> thank-you.html hop even if the later page's URL has
 * no query string. Load this before submit-lead.js on every page that
 * calls submitLead().
 */
(function (global) {
  'use strict';

  var KEYS = ['utm', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  var STORAGE_KEY = 'wangoes_utm';

  function readStored() {
    try {
      return JSON.parse(global.sessionStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  var urlParams = {};
  if (global.location && global.location.search) {
    try {
      var params = new URLSearchParams(global.location.search);
      params.forEach(function (val, key) {
        if (key && val) {
          urlParams[key.toLowerCase()] = val.trim();
        }
      });
    } catch (e) {
      /* Fallback for environments where URLSearchParams is unavailable */
    }
  }

  var stored = readStored();
  var utm = {};

  KEYS.forEach(function (key) {
    utm[key] = urlParams[key] || stored[key] || '';
  });

  try {
    global.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(utm));
  } catch (e) {
    /* sessionStorage unavailable (privacy mode etc.) */
  }

  var utmVal = utm.utm || urlParams.utm || stored.utm || '';
  var utmSourceVal = utm.utm_source || urlParams.utm_source || utmVal;

  global.WANGOES_UTM = {
    utm: utmVal,
    utmSource: utmSourceVal,
    utm_source: utmSourceVal,
    utmMedium: utm.utm_medium || '',
    utm_medium: utm.utm_medium || '',
    utmCampaign: utm.utm_campaign || '',
    utm_campaign: utm.utm_campaign || '',
    utmTerm: utm.utm_term || '',
    utm_term: utm.utm_term || '',
    utmContent: utm.utm_content || '',
    utm_content: utm.utm_content || ''
  };
})(window);
