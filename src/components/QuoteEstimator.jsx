import { useState, useRef } from 'react';
import {
  RATES,
  SERVICES,
  DESTINATIONS,
  DEST_LABEL,
  serviceOf,
  priceConsignment,
  cardFigure,
  ESTIMATE_NOTE,
  RATE_CARD_LIVE,
  PRICED_DESTINATIONS,
} from '../data/rate-card.js';

/**
 * QuoteEstimator — the customer-facing estimate.
 *
 * Every commercial figure comes from ../data/rate-card.js. Nothing in this
 * file is a price. See that module's header for how to go live.
 *
 * Fixed 2026-10-08 — four defects carried from the previous version:
 *   1. THE WEIGHT WAS NEVER APPLIED. The old line read
 *      `Math.round((RATE[service] || RATE.air) * laneMultiplier)`, so 40 kg
 *      to Lagos rendered as "US$7" — the per-kg rate shown as if it were a
 *      total. priceConsignment() multiplies by the weight.
 *   2. `|| RATE.air` silently priced any service without a rate at the AIR
 *      rate, so "Auto shipping" quoted a car by the kilo. There is no
 *      fallback now: no confirmed rate means the office quotes it.
 *   3. Validation errors rendered with a bare `hidden` attribute, so the
 *      customer was never told why the form was rejected. `hidden` removed.
 *   4. `aria-invalid="true"` was written INSIDE the className string, so the
 *      attribute the stylesheet keys on (`.input[aria-invalid="true"]`) was
 *      never set. It is a real attribute now.
 *
 * RESOLVED 2026-10-08 with the rate card in hand: the comment in the old
 * source ("Displayed to customer = actual × 1.05") was the one part of the
 * old maths that was right, and it had simply never been implemented. The
 * rate card confirms the 5% markup on displayed estimates, and it is applied
 * inside priceConsignment() so no service can forget it. The rate card also
 * settles three things the estimator previously guessed at: the minimum
 * charge, the volumetric divisor, and the fact that the invoiced amount is
 * the un-marked-up figure.
 */

const OFFICE_NOTE =
  'The office confirms the figure, the departure and any duty payable before anything is charged.';

function money(n) {
  return 'US$' + n.toLocaleString('en-US');
}

function figureText(amount) {
  return (RATE_CARD_LIVE ? '' : 'Sample ') + money(amount);
}

/**
 * Why the office quotes a service rather than the page. Deliberately worded
 * for a customer: it says what happens next, not which internal figure was
 * missing.
 */
const OFFICE_REASON = {
  'unconfirmed-rate': 'quoted by the office for your consignment.',
  'by-design': 'quoted by the office for every consignment.',
  'unquoted-destination':
    'quoted by the office. We price Lagos online; the office quotes other destinations directly.',
  'no-weight': 'quoted by the office.',
  'unknown-service': 'quoted by the office.',
};

/** The weight below which the rate card's minimum charge takes over. */
function floorThresholdKg(service) {
  const terms = RATES[service];
  if (!terms || typeof terms.perKg !== 'number' || !terms.minimum) return null;
  const kg = terms.minimum / terms.perKg;
  return kg > 0 ? Math.round(kg) : null;
}

function basisSentence(result) {
  if (result.kind === 'office') {
    const label = serviceOf(result.service).label;
    return `${label}: ${OFFICE_REASON[result.reason] ?? 'quoted by the office.'}`;
  }

  const short = serviceOf(result.service).short;
  const dest = DEST_LABEL[result.destination];
  const threshold = floorThresholdKg(result.service);

  const base = result.floorApplied
    ? `${short} to ${dest}, at our minimum charge — which applies to consignments under about ${threshold} kg.`
    : `${result.weight} kg, ${short}, to ${dest}.`;

  return result.indicative
    ? `${base} The rate is indicative and confirmed by the office before booking.`
    : base;
}

export default function QuoteEstimator() {
  const [service, setService] = useState('air');
  const [destination, setDestination] = useState('lagos');
  const [weight, setWeight] = useState('40');
  const [email, setEmail] = useState('');
  const [pickup, setPickup] = useState('');
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});
  const weightRef = useRef(null);

  // A weight is only meaningful for a service, and a destination, we price.
  const officeOnly = Boolean(RATES[service]?.officeOnly);
  const destinationPriced = PRICED_DESTINATIONS.includes(destination);
  const weightRequired = !officeOnly && destinationPriced;

  function clearError(name) {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const newErrors = {};

    const w = parseFloat(weight);
    if (weightRequired && (isNaN(w) || w < 1)) {
      newErrors.weight = 'Enter the weight in kilograms. The estimate needs it.';
    }

    const mail = email.trim();
    if (mail !== '' && mail.indexOf('@') < 1) {
      newErrors.email =
        'Enter an email address in the form name@example.com, or leave the field empty.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstField = Object.keys(newErrors)[0];
      if (firstField === 'weight' && weightRef.current) weightRef.current.focus();
      return;
    }

    setErrors({});

    const priced = priceConsignment({ service, destination, weightKg: w });

    setResult(
      priced.kind === 'figure'
        ? {
            kind: 'figure',
            amount: priced.amount,
            billableKg: priced.billableKg,
            floorApplied: priced.floorApplied,
            indicative: priced.indicative,
            service,
            destination,
            weight: w,
          }
        : { kind: 'office', reason: priced.reason, service, destination, weight: w }
    );
  }

  function handleReset() {
    setService('air');
    setDestination('lagos');
    setWeight('40');
    setEmail('');
    setPickup('');
    setResult(null);
    setErrors({});
  }

  return (
    <form
      className="stack"
      id="quote-form"
      method="get"
      action="#quote-result"
      noValidate
      onSubmit={handleSubmit}
      onReset={handleReset}
    >
      <h2 className="h4">Consignment details</h2>
      <div className="form-grid">
        <div className="field">
          <label className="field__label" htmlFor="q-service">Service</label>
          <select
            className="select"
            id="q-service"
            name="service"
            value={service}
            onChange={(e) => setService(e.target.value)}
          >
            {SERVICES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="q-destination">Destination</label>
          <select
            className="select"
            id="q-destination"
            name="destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          >
            {DESTINATIONS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>

        {weightRequired ? (
          <div className="field">
            <label className="field__label" htmlFor="q-weight">Weight in kilograms</label>
            <input
              ref={weightRef}
              className="input"
              aria-invalid={errors.weight ? 'true' : undefined}
              id="q-weight"
              name="weight"
              type="number"
              min="1"
              step="1"
              value={weight}
              inputMode="numeric"
              onChange={(e) => { setWeight(e.target.value); clearError('weight'); }}
              aria-describedby={errors.weight ? 'q-weight-help q-weight-error' : 'q-weight-help'}
            />
            <p className="field__help" id="q-weight-help">
              Volumetric weight applies where the consignment is bulky rather than heavy.
            </p>
            {errors.weight && (
              <p className="field__error" id="q-weight-error">{errors.weight}</p>
            )}
          </div>
        ) : null}

        <div className="field">
          <label className="field__label" htmlFor="q-email">Your email</label>
          <input
            className="input"
            aria-invalid={errors.email ? 'true' : undefined}
            id="q-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
            aria-describedby={errors.email ? 'q-email-help q-email-error' : 'q-email-help'}
          />
          <p className="field__help" id="q-email-help">
            Optional. The estimate appears either way, and a written quote is only sent if you ask for one.
          </p>
          {errors.email && (
            <p className="field__error" id="q-email-error">{errors.email}</p>
          )}
        </div>

        <div className="field">
          <label className="field__label" htmlFor="q-pickup">Pickup city, United States</label>
          <input
            className="input"
            id="q-pickup"
            name="pickup"
            type="text"
            autoComplete="address-level2"
            placeholder="For example, Houston"
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            aria-describedby="q-pickup-help"
          />
          <p className="field__help" id="q-pickup-help">
            Pickup from your address is available — the collection cost is quoted separately by the office. You can also drop off your barrel at our New York warehouse at no charge.
          </p>
        </div>
      </div>

      <div className="btn-row">
        <button className="btn btn--primary" type="submit">Show my estimate</button>
        <button className="btn btn--secondary" type="reset">Reset</button>
      </div>

      {result && (
        <div className="result" id="quote-result" role="status" aria-live="polite">
          <p className="caption">Estimated price will be</p>
          <p className="result__figure num" id="estimate-figure">
            {result.kind === 'figure' ? figureText(result.amount) : 'Quoted by the office'}
          </p>
          <p className="body-sm muted" id="estimate-basis">{basisSentence(result)}</p>
          <p className="sample-note" id="estimate-note">
            {result.kind === 'office' ? OFFICE_NOTE : ESTIMATE_NOTE}
          </p>
        </div>
      )}

      {!result && (
        <div className="result" id="quote-result" role="status" aria-live="polite">
          <p className="caption">Estimated price will be</p>
          <p className="result__figure num" id="estimate-figure">{cardFigure('air').estimate}</p>
          <p className="body-sm muted" id="estimate-basis">
            40 kg to Lagos, standard air freight, one consignment.
          </p>
          <p className="sample-note" id="estimate-note">{ESTIMATE_NOTE}</p>
        </div>
      )}
    </form>
  );
}
