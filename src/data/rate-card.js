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
 * GOING LIVE, 2026-10-08
 * ----------------------
 * The client rate card is now in hand and RATE_CARD_LIVE is true, so every
 * "sample" notice on the site is off and the figures below are real. The
 * rate card states its own role: "This rate card is the source of truth for
 * the online estimate generator."
 *
 * ⚠ THREE FIGURES THE RATE CARD ITSELF LEAVES OPEN
 * The document carries a "Notes for Franca" section asking her to confirm
 * three things, and it marks them:
 *
 *   - Air Freight, Express — rate per kg AND minimum charge are both blank
 *     ("to be confirmed with Franca"), so express is office-quoted.
 *   - Ocean consolidation — $6.20/kg is a mean of 93 historical shipments
 *     ($5.42–$7.36), labelled "indicative" and "Franca to confirm".
 *   - Auto shipping — the $1,150 saloon-car figure is labelled "website
 *     sample only; Franca to confirm actual rate", so auto is office-quoted.
 *
 * None of the three is published as a standing figure. Where the rate card
 * ALSO says "office quote only" — auto, full container, warehousing — that
 * is followed literally.
 *
 * NOTHING HERE IS A SECRET: the estimator is a client-side React component,
 * so this module ships to the browser. Never put supplier cost or margin in
 * this file. (The rate card's "actual cost" figures are GrandBelle's selling
 * cost, not supplier cost — these are the numbers the office charges.)
 */

/** Live since 2026-10-08, when the client rate card was supplied. */
export const RATE_CARD_LIVE = true;

/** Provenance, so the next person can find the authority for these numbers. */
export const RATE_CARD_SOURCE =
  '/home/eviano/git/grandbelle/artifacts/rate-card-2025-09-22.docx';
export const RATE_CARD_SUPPLIED = '2026-10-08';
/** Still outstanding — the rate card asks Franca to confirm these three. */
export const RATE_CARD_AWAITING_CONFIRMATION = [
  'express per-kg rate and minimum charge (blank in the rate card)',
  'ocean consolidation rate (indicative mean, not a confirmed rate)',
  'auto shipping flat rate (the rate card shows a website sample)',
];

/* ------------------------------------------------------------------ *
 * The two numbers that govern every figure on the site.
 * ------------------------------------------------------------------ */

/**
 * Displayed estimate = actual freight × MARKUP. Invoiced amount = the
 * actual freight, with no markup.
 *
 * The rate card states this three times and works it through for 40 kg to
 * Lagos: $260.00 actual, $13.00 markup, $288.00 displayed (their example
 * also adds $15.00 of insurance — see the note on insurance below).
 *
 * The practical consequence, and it is a good one: the customer is quoted
 * slightly ABOVE what they are eventually invoiced. The rate card calls the
 * difference "the pleasant surprise the customer sees".
 */
export const MARKUP = 1.05;

/**
 * Volumetric divisor. The rate card's first rule of pricing is that rates
 * are charged per BILLABLE weight — "the higher of actual weight or
 * volumetric weight" — and volumetric weight is length × width × height in
 * centimetres ÷ 6000. Same divisor for air and ocean.
 */
export const VOLUMETRIC_DIVISOR = 6000;

/**
 * INSURANCE — RESOLVED 2026-10-08. Insurance is not included in these
 * services, and the site does not show it.
 *
 * The rate card had priced it at 1% of declared value in its worked example,
 * and the lane cards advertised the same figure, while the estimator had
 * stopped collecting declared value at commit 81dcb22 — so nothing was
 * pricing it. The website lead ruled it out on 2026-10-08, and Eviano
 * confirmed the same day, plainly: "Drop the 'insurance included' — it is
 * not."
 *
 * The rate card itself has since been corrected to match: the insurance row
 * is out of its worked example (which now displays $273.00 for 40 kg to
 * Lagos, the figure this module returns), and the standard-air service
 * description no longer claims insurance. See docs/rate-card-provenance.md
 * in the grandbelle repo.
 *
 * So the client and this module now agree, and there is no conflict left to
 * arbitrate. If insurance is ever reinstated as a priced service it belongs
 * HERE and not in a page:
 *     const insurance = INSURANCE_RATE * declaredValue;
 *     displayed = actualFreight * MARKUP + insurance;   // markup is on
 *     // freight only, per the rate card's worked example.
 */
export const INSURANCE_POLICY = 'not-included-confirmed-by-client-2026-10-08';

/* ------------------------------------------------------------------ *
 * Rates.
 * ------------------------------------------------------------------ */

/**
 * Per-service commercial terms, transcribed from the rate card.
 *
 *   perKg      — USD per billable kg
 *   minimum    — the floor charge the rate card calls "minimum charge"
 *   officeOnly — the rate card says "office quote only"
 *   indicative — the rate card publishes the figure but asks for it to be
 *                confirmed; shown, and labelled as indicative
 *
 * A perKg of null means "the rate card has no figure": the estimator must
 * send the customer to the office rather than guess.
 */
export const RATES = {
  air: { perKg: 6.5, minimum: 100 }, // 303 ledger records; minimum consistent with observed floor
  express: { perKg: null, minimum: null }, // ⚠ blank in the rate card
  ocean: { perKg: 6.2, minimum: 0, indicative: true }, // ⚠ mean of 93 shipments
  auto: { officeOnly: true }, // rate card: "Office quote only"
  barrel: { officeOnly: true }, // ⚠ barrels are not in the rate card at all
};

/**
 * Only the Lagos corridor is priced, because only the Lagos corridor is in
 * the rate card ("Destination: Lagos, Nigeria") and, per Eviano on
 * 2026-09-28, only the Lagos lane is operated — the other destinations are
 * advertised scope.
 *
 * ⚠ The seven-entry lane-multiplier table that used to sit here has been
 * removed from pricing. Nothing in the rate card supports those multipliers,
 * and inventing a 1.18× for Abuja would be exactly the fault this file was
 * created to fix. Other destinations are office-quoted.
 *
 * To price more destinations, add them to the rate card first, then to this
 * array with a sourced multiplier.
 */
export const PRICED_DESTINATIONS = ['lagos'];

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

/* ------------------------------------------------------------------ *
 * Transit windows and storage — also single-sourced, because the site
 * had two different ocean windows published at once (lane cards said 5–7
 * weeks, services.json said 4–6 weeks) and the rate card says neither.
 * ------------------------------------------------------------------ */

/**
 * Verbatim from the rate card. Note the ocean wording is "from the date of
 * sailing" — it is not a door-to-door window, and the card is explicit
 * about that, so the site should be too.
 */
export const TRANSIT = {
  express: '2–5 business days',
  air: '7–10 business days',
  ocean: '3–4 weeks from the date of sailing',
  oceanFcl: '3–4 weeks from the date of sailing',
  auto: '3–4 weeks from the date of sailing',
  // ⚠ Barrels are not in the rate card. The sea window is inherited from the
  // ocean terms rather than sourced, because a barrel travels consolidated
  // by sea; flagged so nobody reads it as a confirmed figure.
  barrel: '3–4 weeks from the date of sailing',
};

/**
 * The same windows, short enough for a card badge.
 *
 * The badges are what most visitors actually read, so they must not imply
 * more than the long form. "3 to 4 weeks" on its own would read as
 * door-to-door, which it is not — the rate card is explicit that the ocean
 * window runs from the date of SAILING — hence "at sea".
 */
export const TRANSIT_SHORT = {
  express: '2 to 5 business days',
  air: '7 to 10 business days',
  ocean: '3 to 4 weeks at sea',
  oceanFcl: '3 to 4 weeks at sea',
  auto: '3 to 4 weeks at sea',
  barrel: '3 to 4 weeks at sea',
};

/**
 * Warehousing, from the rate card: "Cargo held at the New York warehouse
 * until release... No charge until the consignment is released", maximum
 * hold 1 month free, storage charged weekly after that, and — the number
 * that matters to a consolidating reseller — "Cargo cannot be on hold for
 * more than 4 weeks to consolidate a shipment."
 */
export const STORAGE = {
  freePeriod: '1 month free',
  afterFree: 'charged weekly after the first month',
  maxConsolidationHold: '4 weeks',
};

export function serviceOf(value) {
  return SERVICES.find((s) => s.value === value) ?? SERVICES[0];
}

/**
 * Billable weight: the higher of actual and volumetric, which is the rate
 * card's first rule. Split out as its own function so the office, a future
 * consolidation portal and the estimator all agree on it.
 */
export function billableKg({ actualKg, dimensionsCm } = {}) {
  const actual = Number(actualKg);
  const hasActual = Number.isFinite(actual) && actual > 0;

  let volumetric = 0;
  if (Array.isArray(dimensionsCm) && dimensionsCm.length === 3) {
    const [l, w, h] = dimensionsCm.map(Number);
    if ([l, w, h].every((n) => Number.isFinite(n) && n > 0)) {
      volumetric = (l * w * h) / VOLUMETRIC_DIVISOR;
    }
  }

  if (!hasActual && volumetric <= 0) return null;
  return Math.max(hasActual ? actual : 0, volumetric);
}

/**
 * The price of one consignment, and — just as importantly — whether we are
 * entitled to show it at all.
 *
 * Returns one of:
 *   { kind: 'figure', amount, actual, billableKg, indicative, basis }
 *   { kind: 'office', reason }
 *
 * `amount` is what the customer is shown (freight × MARKUP). `actual` is
 * what they are invoiced, per the rate card.
 *
 * DELIBERATE DESIGN, 2026-10-08
 * There is no cross-service fallback, on purpose. The previous
 * implementation read `RATE[service] || RATE.air`, so any service without a
 * rate silently borrowed the AIR rate; because "Auto shipping" quotes 0 and
 * 0 is falsy, selecting it priced a car at the air per-kg rate. A service
 * with no confirmed figure must send the customer to the office instead.
 */
export function priceConsignment({ service, destination, weightKg, dimensionsCm }) {
  const terms = RATES[service];
  if (!terms) return { kind: 'office', reason: 'unknown-service' };
  if (terms.officeOnly) return { kind: 'office', reason: 'by-design' };
  if (typeof terms.perKg !== 'number') {
    return { kind: 'office', reason: 'unconfirmed-rate' };
  }
  if (!PRICED_DESTINATIONS.includes(destination)) {
    return { kind: 'office', reason: 'unquoted-destination' };
  }

  const billable = billableKg({ actualKg: weightKg, dimensionsCm });
  if (billable === null) return { kind: 'office', reason: 'no-weight' };

  const rated = terms.perKg * billable;
  const actual = Math.max(rated, terms.minimum ?? 0);
  const amount = Math.round(actual * MARKUP);

  return {
    kind: 'figure',
    amount,
    actual: Math.round(actual * 100) / 100,
    billableKg: Math.round(billable * 100) / 100,
    floorApplied: rated < (terms.minimum ?? 0),
    indicative: Boolean(terms.indicative),
    basis: { weightKg: billable, laneMultiplier: 1 },
  };
}

/* ------------------------------------------------------------------ *
 * Service-card figures.
 *
 * These appear on four pages. With the card live they are the real pairs;
 * anything the rate card does not price falls to "Quoted" rather than to a
 * figure.
 * ------------------------------------------------------------------ */

/**
 * Live card pairs, all computed by priceConsignment() rather than typed in:
 *
 *   standard air, 40 kg to Lagos  →  $260.00 actual → $273.00 displayed
 *     (the rate card's own worked example, minus its insurance line)
 *   ocean, 1 cbm to Lagos         →  1,000,000 cm³ ÷ 6000 = 166.67 billable
 *     kg → $1,033.33 actual → $1,085.00 displayed
 *
 * ⚠ The ocean card is the one to sanity-check with Franca. Under the rate
 * card's own rules (per-kg rate, divisor 6000) one cubic metre is $1,085,
 * which is three times the $340 the card used to show. That may be correct,
 * or ocean may in fact be sold per cubic metre directly rather than through
 * the air divisor — the rate card says "charged by volume (cubic metres) or
 * weight per pallet, whichever yields the higher charge", which is not quite
 * the same rule. The figure is shown with an "indicative" label until that
 * is settled.
 */
export const LIVE_CARD_FIGURES = {
  express: {
    estimate: 'Quoted',
    estimateNote: `Priced by the office. The rate card leaves the express rate and minimum charge open.`,
  },
  air: {
    estimate: 'US$273',
    estimateNote: `40 kg to Lagos, standard air freight, from our published rate card.`,
  },
  ocean: {
    estimate: 'US$1,085',
    estimateNote: `One cubic metre to Lagos, billed at 167 kg volumetric. Indicative rate.`,
  },
  oceanFcl: {
    estimate: 'Quoted',
    estimateNote: `Per container. The office quotes full-container shipments.`,
  },
  auto: {
    estimate: 'Quoted',
    estimateNote: `Per vehicle, by size and condition. The office quotes auto shipping.`,
  },
  barrel: {
    estimate: 'Quoted',
    estimateNote: `Per barrel. The office quotes barrel shipments.`,
  },
  warehousing: {
    estimate: 'Quoted',
    estimateNote: `Per consignment held. First month free, then charged weekly.`,
  },
};

/** Kept only as provenance for what the site showed before 2026-10-08. */
export const SUPERSEDED_SAMPLE_CARD_FIGURES = {
  express: 'Sample US$430',
  air: 'Sample US$285',
  ocean: 'Sample US$340',
  auto: 'Sample US$1,150',
  barrel: 'Sample US$230',
};

const QUOTED = {
  estimate: 'Quoted',
  estimateNote: 'Quoted by the office for this service.',
};

/** Safe accessor: never returns a figure we cannot stand behind. */
export function cardFigure(key) {
  if (!RATE_CARD_LIVE) return SAMPLE_CARD_FIGURES[key] ?? QUOTED;
  return LIVE_CARD_FIGURES[key] ?? QUOTED;
}

/** Retained so the pre-live table is not silently lost. */
export const SAMPLE_CARD_FIGURES = {
  express: { estimate: 'Sample US$430', estimateNote: '40 kg to Lagos. Sample figure for design review.' },
  air: { estimate: 'Sample US$285', estimateNote: '40 kg to Lagos. Sample figure for design review.' },
  ocean: { estimate: 'Sample US$340', estimateNote: 'One cubic metre to Lagos. Sample figure for design review.' },
  oceanFcl: { estimate: 'Quoted', estimateNote: 'Per container. The estimator returns a figure for consolidation only.' },
  auto: { estimate: 'Sample US$1,150', estimateNote: 'Saloon car to Lagos. Sample figure for design review.' },
  barrel: { estimate: 'Sample US$230', estimateNote: 'Per barrel to Lagos. Sample figure for design review.' },
  warehousing: { estimate: 'Quoted', estimateNote: 'Per consignment held.' },
};

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
  ? 'From our published rate card. The office confirms the departure and any duty payable before anything is charged.'
  : 'Sample figure for design review. The live figure comes from the client rate card, and the estimate is confirmed by the office before booking.';
