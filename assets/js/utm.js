/*
 * Captures utm_source / utm_medium / utm_campaign from the URL on first
 * touch and persists them in sessionStorage so they survive the
 * registration -> thank-you.html hop even if the later page's URL has
 * no query string. Load this before submit-lead.js on every page that
 * calls submitLead().
 */
(function (global) {
  'use strict';

  var KEYS = ['utm_source', 'utm_medium', 'utm_campaign'];
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

  global.WANGOES_UTM = {
    utmSource: utm.utm_source,
    utmMedium: utm.utm_medium,
    utmCampaign: utm.utm_campaign
  };
})(window);
