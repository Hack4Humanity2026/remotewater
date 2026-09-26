// i18n.js — English, French and Inuktitut (Nunavik dialect, syllabics).
// Inuktitut strings marked null have NOT been translated yet. The UI falls back to English and shows a
// visible "translation pending" mark so nobody mistakes a fallback for a real translation.
// Do not machine-translate these. Have them checked by a Nunavik Inuktitut speaker (Amenda is on site).

export const LANGS = { en: 'English', fr: 'Français', iu: 'ᐃᓄᒃᑎᑐᑦ' };

const S = {
  appName:        { en: 'RemoteWater', fr: 'RemoteWater', iu: null },
  tabOverview:    { en: 'Overview', fr: 'Vue d’ensemble', iu: null },
  tabNotice:      { en: 'Notice channels', fr: 'Canaux d’avis', iu: null },
  water:          { en: 'Water', fr: 'Eau', iu: 'ᐃᒥᖅ' },
  tabPlant:       { en: 'Plant', fr: 'Usine', iu: null },
  tabLab:         { en: 'Lab', fr: 'Labo', iu: null },
  tabTruck:       { en: 'Truck', fr: 'Camion', iu: null },
  tabHome:        { en: 'Home', fr: 'Maison', iu: null },
  tabReplay:      { en: 'Demo', fr: 'Démo', iu: null },
  statusGreen:    { en: 'Safe to drink', fr: 'Bonne à boire', iu: null },
  statusYellow:   { en: 'Check before drinking', fr: 'Vérifier avant de boire', iu: null },
  statusRed:      { en: 'Boil before drinking', fr: 'Faire bouillir avant de boire', iu: null },
  boilHow:        { en: 'Boil water for 1 minute before drinking, cooking, brushing teeth or making baby formula.',
                    fr: 'Faites bouillir l’eau 1 minute avant de la boire, de cuisiner, de vous brosser les dents ou de préparer du lait pour bébé.', iu: null },
  deliveredOn:    { en: 'Water delivered', fr: 'Eau livrée', iu: null },
  fromTruck:      { en: 'Truck', fr: 'Camion', iu: null },
  batch:          { en: 'Batch', fr: 'Lot', iu: null },
  safeUntil:      { en: 'Estimated safe until', fr: 'Sûre jusqu’à (estimation)', iu: null },
  noDelivery:     { en: 'No delivery on record', fr: 'Aucune livraison enregistrée', iu: null },
  allClear:       { en: 'All clear. Your water is safe again.', fr: 'Fin de l’avis. Votre eau est de nouveau sûre.', iu: null },
  notAffected:    { en: 'Your home did not receive the affected water.', fr: 'Votre maison n’a pas reçu l’eau concernée.', iu: null },
  smsBoil:        { en: 'RemoteWater: water delivered to your home on {date} may be unsafe. BOIL 1 minute before drinking. Reply 1 for details.',
                    fr: 'RemoteWater : l’eau livrée chez vous le {date} pourrait être non sécuritaire. FAIRE BOUILLIR 1 minute avant de boire. Répondez 1 pour plus d’infos.', iu: null },
  smsClear:       { en: 'RemoteWater: the boil-water notice for your home is lifted. Water delivered from {date} is safe.',
                    fr: 'RemoteWater : l’avis d’ébullition pour votre maison est levé. L’eau livrée à partir du {date} est sûre.', iu: null },
  smsNotAffected: { en: 'RemoteWater: a water notice was issued today. Your home did NOT receive the affected water. No action needed.',
                    fr: 'RemoteWater : un avis sur l’eau a été émis aujourd’hui. Votre maison n’a PAS reçu l’eau concernée. Rien à faire.', iu: null },
  pendingIu:      { en: 'Inuktitut translation pending', fr: 'Traduction inuktitut à venir', iu: null },
  language:       { en: 'Language', fr: 'Langue', iu: null },
  sampleTaken:    { en: 'Sample taken', fr: 'Échantillon prélevé', iu: null },
  resultBack:     { en: 'Lab result received', fr: 'Résultat du labo reçu', iu: null },
  fail:           { en: 'FAIL', fr: 'ÉCHEC', iu: null },
  pass:           { en: 'pass', fr: 'conforme', iu: null },
  housesAffected: { en: 'homes affected', fr: 'maisons concernées', iu: null },
  housesTotal:    { en: 'homes total', fr: 'maisons au total', iu: null },
  sendAlerts:     { en: 'Send boil-water SMS to affected homes', fr: 'Envoyer le SMS d’ébullition aux maisons concernées', iu: null },
  sendClear:      { en: 'Send all-clear', fr: 'Envoyer la levée d’avis', iu: null },
  outbox:         { en: 'SMS outbox (simulated)', fr: 'Boîte d’envoi SMS (simulée)', iu: null },
  newLoad:        { en: 'New load (filled at plant)', fr: 'Nouveau chargement (rempli à l’usine)', iu: null },
  delivered:      { en: 'Delivered', fr: 'Livré', iu: null },
  truckEmptied:   { en: 'Tank was empty before refill', fr: 'Réservoir vide avant le remplissage', iu: null },
  offlineQueue:   { en: 'Waiting to sync', fr: 'En attente de synchronisation', iu: null },
  synced:         { en: 'Synced', fr: 'Synchronisé', iu: null },
  freeCl:         { en: 'Free chlorine (mg/L)', fr: 'Chlore libre (mg/L)', iu: null },
  turbidity:      { en: 'Turbidity (NTU)', fr: 'Turbidité (UTN)', iu: null },
};

let current = 'en';
export function setLang(l) { current = LANGS[l] ? l : 'en'; }
export function getLang() { return current; }

/** Translate a key. Returns { text, fallback } so the UI can flag untranslated Inuktitut. */
export function tr(key, vars = {}) {
  const entry = S[key];
  if (!entry) return { text: key, fallback: false };
  let text = entry[current];
  const fallback = text == null;
  if (fallback) text = entry.en;
  for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, v);
  return { text, fallback };
}

export function t(key, vars) { return tr(key, vars).text; }

export function fmtDate(iso, lang = current) {
  const d = new Date(iso);
  const loc = lang === 'fr' ? 'fr-CA' : 'en-CA';
  return d.toLocaleString(loc, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Toronto' });
}
export function fmtDay(iso, lang = current) {
  const loc = lang === 'fr' ? 'fr-CA' : 'en-CA';
  return new Date(iso).toLocaleDateString(loc, { month: 'long', day: 'numeric', timeZone: 'America/Toronto' });
}
