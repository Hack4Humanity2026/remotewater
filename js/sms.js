// sms.js — message templates and a simulated outbox.
// In production the plant computer (which has connectivity) sends through an SMS gateway.
// SMS is deliberate: it works on any phone, needs no data plan, and survives Tamaani/Starlink outages
// as long as the cell site is up. The driver's phone can send the same message directly as a fallback.

import { tr, setLang, getLang, fmtDay } from './i18n.js';

export function compose(kind, house, vars = {}) {
  const prev = getLang();
  setLang(house.lang || 'en');
  const key = { boil: 'smsBoil', clear: 'smsClear', notAffected: 'smsNotAffected' }[kind];
  const { text, fallback } = tr(key, { date: vars.date ? fmtDay(vars.date, house.lang) : '' });
  setLang(prev);
  return { text, fallback, lang: house.lang || 'en' };
}

export class Outbox {
  constructor() { this.messages = []; }
  send(kind, house, at, vars) {
    for (const phone of house.phones?.length ? house.phones : ['(no phone on file)']) {
      const m = compose(kind, house, vars);
      this.messages.push({ id: `M${this.messages.length + 1}`, at, houseId: house.id, phone, kind, ...m, chars: m.text.length, segments: Math.ceil(m.text.length / 160) });
    }
  }
  clear() { this.messages = []; }
}
