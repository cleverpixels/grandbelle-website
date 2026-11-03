/**
 * contact.js — THE single source of truth for the telephone numbers shown
 * anywhere on this website.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * On 2026-11-03 the owner reported that the US telephone lines are not
 * operational. The support number (+1 516 256-5666) was typed literally into
 * seven places — the header, the header drawer, the footer, the home
 * answer band, the About contact card, the quote page and the track page —
 * so taking it down meant seven edits, and missing one would leave a dead
 * number on the page a customer calls. The numbers now live in exactly one
 * place.
 *
 * THE FLAG
 * --------
 * PHONE_LINES_LIVE is false while the phone lines are down. Set it to true
 * when they work again: the Support line returns exactly as it was (same
 * label, same `tel:` href) on every page, and the two WhatsApp lines stay,
 * because a customer can still reach the office on WhatsApp. Nothing else
 * needs editing — every page reads this file.
 *
 * The WhatsApp numbers are the owner's, given 2026-11-03, and are written
 * here verbatim. Do not reformat or "correct" them. The primary was already
 * on the site; the secondary is new.
 *
 * NOT IN THIS FILE, DELIBERATELY
 * ------------------------------
 * The Lagos landline +234 803 513 7916 is unchanged and is left literal in
 * the footer and the About page: the owner has not asked for it to change.
 * See the card for the list of its places.
 */

/** False while the US telephone lines are down (owner, 2026-11-03). */
export const PHONE_LINES_LIVE = false;

/** The US support line, shown again the moment PHONE_LINES_LIVE is true. */
export const SUPPORT_PHONE = {
  role: null,
  display: '+1 (516) 256-5666',
  label: 'Support +1 (516) 256-5666',
  href: 'tel:+15162565666',
};

/**
 * The two WhatsApp lines, in the order they should be shown.
 * `display` is the number as a person reads it; `label` prefixes it with
 * "WhatsApp" for links that need to say how you reach it.
 */
export const WHATSAPP_LINES = [
  {
    role: 'primary',
    display: '+1 (347) 712-8862',
    label: 'WhatsApp +1 (347) 712-8862',
    href: 'https://wa.me/13477128862',
  },
  {
    role: 'secondary',
    display: '+1 (516) 554-2016',
    label: 'WhatsApp +1 (516) 554-2016',
    href: 'https://wa.me/15165542016',
  },
];

export const WHATSAPP_PRIMARY = WHATSAPP_LINES[0];
export const WHATSAPP_SECONDARY = WHATSAPP_LINES[1];

/**
 * The ordered list every contact block (header drawer, footer, About card,
 * answer band) renders: the WhatsApp lines while the phones are down, and
 * the Support line ahead of them once they are back. Nothing is ever
 * removed from this list by the flag.
 */
export const CONTACT_LINES = PHONE_LINES_LIVE
  ? [SUPPORT_PHONE, ...WHATSAPP_LINES]
  : WHATSAPP_LINES;

/** Label for a line, with the role in brackets where one is set. */
export function lineLabel(line) {
  return line.role ? `${line.label} (${line.role})` : line.label;
}

/** The single line the desktop header bar has room for. */
export const HEADER_LINE = PHONE_LINES_LIVE ? SUPPORT_PHONE : WHATSAPP_PRIMARY;

export const EMAIL = {
  display: 'info@grandbelleinternational.com',
  href: 'mailto:info@grandbelleinternational.com',
};
