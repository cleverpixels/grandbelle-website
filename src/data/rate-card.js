/**
 * rate-card.js — THE single source of truth for every commercial figure
 * shown anywhere on this website.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Before 2026-10-08 the same prices were typed into five separate files:
 * QuoteEstimator.jsx and the lane-card arrays inside index.astro,
 * about.astro, get-a-quote.astro and shipping-a-car.astro. A rate change
 * meant five edits and four of them were easy to miss — and the figures
 * had already drifted apart (the lane card promised US$285 for 40 kg to
 * Lagos while the estimator returned US$7, because a later edit dropped
 * the weight from the multiplication).
 *
 * A price the office does not honour is worse than no price at all, so
 * the figures now live in exactly one place.
 *
 * HOW TO GO LIVE
 * --------------
 *   1. Put the confirmed figures in RATES and LIVE_CARD_FIGURES.
 *   2. Set RATE_CARD_LIVE = true.
 * That single flag turns off "sample" wording everywhere on the site and
 * removes every placeholder notice, in one edit.
 *
 * While RATE_CARD_LIVE is false, every figure the site shows is a labelled
 * sample and no page claims otherwise. Nothing here is a secret: the
 * estimator is a client-side React component, so this module ships to the
 * browser. Never put supplier cost or margin in this file.
 */

/** Flip to true only when RATES and LIVE_CARD_FIGURES are confirmed. */
export const RATE_CARD_LIVE = false;

/** Provenance, so the next person can find the authority for these numbers. */
export const RATE_CARD_SOURCE =
  '/home/eviano/git/grandbelle/artifacts/rate-card-2025-09-22.docx';
export const RATE_CARD_CONFIRMED_BY = null; // e.g. 'Franca, 2026-10-__'

/**
 * Per-service commercial terms.
 *
 *   perKg      — USD per billable kg, before the lane multiplier
 *   flat       — USD flat charge that the lane multiplier does not move
 *   officeOnly — the service is never priced online, by design
 *
 * An hourly rate set to null means "we do not have a confirmed figure":
 * the estimator must send the customer to the office rather than guess.
 */
export const RATES = {
  air: { perKg: 6.5 },
  express: { perKg: 7.0 }, // ⚠ placeholder — Franca to confirm
  ocean: { perKg: 6.2 },
  auto: { officeOnly: true }, // commit b41028b intended this; see note below
  barrel: { flat: 230 },
};

/**
 * Lane multipliers applied to the per-kg rate.
 * Lagos is the only lane currently operated (per Eviano, 2026-09-28);
 * the rest are advertised scope and are not operations.
 */
export const LANE = {
  lagos: 1.0,
  abuja: 1.18,
  accra: 1.12,
  cotonou: 1.14,
  lome: 1.15,
  abidjan: 1.2,
  other: 1.25,
  barrel: 1.0,
};

export const SERVICES = [
  { value: 'air', label: 'Air freight, standard', short: 'standard air freight' },
  { value: 'express', label: 'Air freight, express', short: 'express air freight' },
  { value: 'ocean', label: 'Ocean freight, consolidation', short: 'ocean freight consolidation' },
  { value: 'auto', label: 'Auto shipping', short: 'auto shipping' },
  { value: 'barrel', label: 'Barrel shipment', short: 'barrel shipment' },
];

export const DESTINATIONS = [
  { value: 'lagos', label: 'Lagos, Nigeria' },
  { value: 'abuja', label: 'Abuja, Nigeria' },
  { value: 'accra', label: 'Accra, Ghana' },
  { value: 'cotonou', label: 'Cotonou, Benin' },
  { value: 'lome', label: 'Lome, Togo' },
  { value: 'abidjan', label: 'Abidjan, Cote d Ivoire' },
  { value: 'other', label: 'Another West African destination' },
];

/** Human-readable names used in the sentence under the figure. */
export const DEST_LABEL = {
  lagos: 'Lagos, Nigeria',
  abuja: 'Abuja, Nigeria',
  accra: 'Accra, Ghana',
  cotonou: 'Cotonou, Benin',
  lome: 'Lome, Togo',
  abidjan: 'Abidjan, Cote d Ivoire',
  other: 'a West African destination',
  barrel: 'Lagos, Nigeria',
};

export function serviceOf(value) {
  return SERVICES.find((s) => s.value === value) ?? SERVICES[0];
}

/**
 * The price of one consignment, and — just as importantly — whether we are
 * entitled to show it at all.
 *
 * Returns one of:
 *   { kind: 'figure', amount, basis }  a figure we can stand behind
 *   { kind: 'office' }                 no confirmed figure; ask the office
 *
 * DELIBERATE CHANGE, 2026-10-08
 * The previous implementation read `RATE[service] || RATE.air`, so any
 * service without a rate silently fell back to the AIR rate. "Auto
 * shipping" quotes $0 in RATES because it is office-only, and 0 is falsy —
 * so selecting it priced a car at the air-freight per-kg rate. There is no
 * fallback here on purpose: a service with no figure must never borrow
 * another service's.
 */
export function priceConsignment({ service, destination, weightKg }) {
  const terms = RATES[service];
  if (!terms) return { kind: 'office' };
  if (terms.officeOnly) return { kind: 'office' };

  const lane = LANE[service === 'barrel' ? 'barrel' : destination] ?? 1;

  if (typeof terms.flat === 'number') {
    return {
      kind: 'figure',
      amount: Math.round(terms.flat * lane),
      basis: undefined,
    };
  }

  if (typeof terms.perKg !== 'number') return { kind: 'office' };

  const w = Number(weightKg);
  if (!Number.isFinite(w) || w <= 0) return { kind: 'office' };

  return {
    kind: 'figure',
    amount: Math.round(terms.perKg * lane * w),
    basis: { weightKg: w, laneMultiplier: lane },
  };
}

/* ------------------------------------------------------------------ *
 * Lane-card figures.
 *
 * The service cards appear on four pages. While the card is not live they
 * show the agreed sample pair; once RATE_CARD_LIVE is true they show the
 * confirmed pair, and any key with no confirmed pair falls back to
 * "Quoted" rather than to a figure.
 * ------------------------------------------------------------------ */

export const SAMPLE_CARD_FIGURES = {
  express: {
    estimate: 'Sample US$430',
    estimateNote: '40 kg to Lagos. Sample figure for design review.',
  },
  air: {
    estimate: 'Sample US$285',
    estimateNote: '40 kg to Lagos. Sample figure for design review.',
  },
  ocean: {
    estimate: 'Sample US$340',
    estimateNote: 'One cubic metre to Lagos. Sample figure for design review.',
  },
  oceanFcl: {
    estimate: 'Quoted',
    estimateNote: 'Per container. The estimator returns a figure for consolidation only.',
  },
  auto: {
    estimate: 'Sample US$1,150',
    estimateNote: 'Saloon car to Lagos. Sample figure for design review.',
  },
  barrel: {
    estimate: 'Sample US$230',
    estimateNote: 'Per barrel to Lagos. Sample figure for design review.',
  },
  warehousing: {
    estimate: 'Quoted',
    estimateNote: 'Per consignment held.',
  },
};

/** Fill this in from the rate card, then set RATE_CARD_LIVE = true. */
export const LIVE_CARD_FIGURES = {};

const QUOTED = {
  estimate: 'Quoted',
  estimateNote: 'Quoted by the office for this service.',
};

/** Safe accessor: never returns a figure we cannot stand behind. */
export function cardFigure(key) {
  const table = RATE_CARD_LIVE ? LIVE_CARD_FIGURES : SAMPLE_CARD_FIGURES;
  return table[key] ?? (RATE_CARD_LIVE ? QUOTED : SAMPLE_CARD_FIGURES[key] ?? QUOTED);
}

/* ------------------------------------------------------------------ *
 * Placeholder notices.
 *
 * Driven off the one flag so that going live removes every one of them.
 * ------------------------------------------------------------------ */

export const RATE_CARD_NOTICE = RATE_CARD_LIVE
  ? null
  : {
      label: 'Sample figures for design review',
      body: 'Every figure on this page is a stand-in so the layout can be judged, and every figure is in United States dollars. The live figures come from the client rate card.',
    };

export const RATE_CARD_FOOTER = RATE_CARD_LIVE
  ? null
  : 'Sample figures and transit windows shown for design review.';

/** The wording under the estimator's figure. */
export const ESTIMATE_NOTE = RATE_CARD_LIVE
  ? 'This figure comes from our published rate card. The office confirms it before booking.'
  : 'Sample figure for design review. The live figure comes from the client rate card, and the estimate is confirmed by the office before booking.';
