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

  var params = new URLSearchParams(global.location.search);
  var stored = readStored();
  var utm = {};

  KEYS.forEach(function (key) {
    utm[key] = params.get(key) || stored[key] || '';
  });

  try {
    global.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(utm));
  } catch (e) {
    /* sessionStorage unavailable (privacy mode etc.) — degrade to no UTM tracking */
  }

  var utmVal = utm.utm || '';
  var utmSourceVal = utm.utm_source || utmVal;

  global.WANGOES_UTM = {
    utm: utmVal,
    utmSource: utmSourceVal,
    utmMedium: utm.utm_medium || '',
    utmCampaign: utm.utm_campaign || '',
    utmTerm: utm.utm_term || '',
    utmContent: utm.utm_content || ''
  };
})(window);
