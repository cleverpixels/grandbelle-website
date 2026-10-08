import { useState, useRef } from 'react';

const DESTINATIONS = [
  { value: 'lagos', label: 'Lagos, Nigeria' },
  { value: 'abuja', label: 'Abuja, Nigeria' },
  { value: 'accra', label: 'Accra, Ghana' },
  { value: 'cotonou', label: 'Cotonou, Benin' },
  { value: 'lome', label: 'Lome, Togo' },
  { value: 'abidjan', label: 'Abidjan, Cote d Ivoire' },
  { value: 'other', label: 'Another West African destination' },
];

const SERVICES = [
  { value: 'air', label: 'Air freight, standard' },
  { value: 'express', label: 'Air freight, express' },
  { value: 'ocean', label: 'Ocean freight, consolidation' },
  { value: 'auto', label: 'Auto shipping' },
  { value: 'barrel', label: 'Barrel shipment' },
];

// Sample rates — must be replaced with client rate card
const RATE = { air: 6.5, express: 9.8, ocean: 3.4, auto: 22.0, barrel: 230 };
const LANE = { lagos: 1.0, abuja: 1.18, accra: 1.12, cotonou: 1.14, lome: 1.15, abidjan: 1.2, other: 1.25, barrel: 1.0 };
const LABEL = { air: 'standard air freight', express: 'express air freight', ocean: 'ocean freight consolidation', auto: 'auto shipping', barrel: 'barrel shipment' };
const DEST = { lagos: 'Lagos, Nigeria', abuja: 'Abuja, Nigeria', accra: 'Accra, Ghana', cotonou: 'Cotonou, Benin', lome: 'Lome, Togo', abidjan: 'Abidjan, Cote d Ivoire', other: 'a West African destination', barrel: 'Lagos, Nigeria' };

function money(n) { return 'US$' + n.toLocaleString('en-US'); }

export default function QuoteEstimator() {
  const [service, setService] = useState('air');
  const [destination, setDestination] = useState('lagos');
  const [weight, setWeight] = useState('40');
  const [email, setEmail] = useState('');
  const [pickup, setPickup] = useState('');
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});
  const weightRef = useRef(null);

  function clearError(name) {
    setErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const newErrors = {};

    const w = parseFloat(weight);
    if (service !== 'barrel' && (isNaN(w) || w < 1)) {
      newErrors.weight = 'Enter the weight in kilograms. The estimate needs it.';
    }

    const mail = email.trim();
    if (mail !== '' && mail.indexOf('@') < 1) {
      newErrors.email = 'Enter an email address in the form name@example.com, or leave the field empty.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstField = Object.keys(newErrors)[0];
      if (firstField === 'weight' && weightRef.current) weightRef.current.focus();
      return;
    }

    // Barrel shipment is a flat rate; the lane multiplier does not change the base.
    const laneMultiplier = service === 'barrel' ? (LANE.barrel || 1) : (LANE[destination] || 1);
    const freight = Math.round((RATE[service] || RATE.air) * laneMultiplier);

    setResult({
      freight,
      total: freight,
      service,
      destination,
      weight: w,
    });
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
    <form className="stack" id="quote-form" method="get" action="#quote-result" noValidate onSubmit={handleSubmit} onReset={handleReset}>
      <h2 className="h4">Consignment details</h2>
      <div className="form-grid">
        <div className="field">
          <label className="field__label" htmlFor="q-service">Service</label>
          <select className="select" id="q-service" name="service" value={service} onChange={e => setService(e.target.value)}>
            {SERVICES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="q-destination">Destination</label>
          <select className="select" id="q-destination" name="destination" value={destination} onChange={e => setDestination(e.target.value)}>
            {DESTINATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        {service !== 'barrel' ? (
          <div className="field">
            <label className="field__label" htmlFor="q-weight">Weight in kilograms</label>
            <input
              ref={weightRef}
              className={`input${errors.weight ? ' aria-invalid="true"' : ''}`}
              id="q-weight"
              name="weight"
              type="number"
              min="1"
              step="1"
              value={weight}
              inputMode="numeric"
              onChange={e => { setWeight(e.target.value); clearError('weight'); }}
              aria-describedby="q-weight-help q-weight-error"
            />
            <p className="field__help" id="q-weight-help">Volumetric weight applies where the consignment is bulky rather than heavy.</p>
            {errors.weight && <p className="field__error" id="q-weight-error" hidden>{errors.weight}</p>}
          </div>
        ) : null}
        <div className="field">
          <label className="field__label" htmlFor="q-email">Email for the written quote</label>
          <input
            className={`input${errors.email ? ' aria-invalid="true"' : ''}`}
            id="q-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={e => { setEmail(e.target.value); clearError('email'); }}
            aria-describedby="q-email-help q-email-error"
          />
          <p className="field__help" id="q-email-help">Optional. The estimate appears either way, and a written quote is only sent if you ask for one.</p>
          {errors.email && <p className="field__error" id="q-email-error" hidden>{errors.email}</p>}
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
            onChange={e => setPickup(e.target.value)}
            aria-describedby="q-pickup-help"
          />
          <p className="field__help" id="q-pickup-help">Pickup from your address is available — the collection cost is quoted separately by the office. You can also drop off your barrel at our New York warehouse at no charge.</p>
        </div>
      </div>
      <div className="btn-row">
        <button className="btn btn--primary" type="submit">Show my estimate</button>
        <button className="btn btn--secondary" type="reset">Reset</button>
      </div>

      {result && (
        <div className="result" id="quote-result" role="status" aria-live="polite">
          <p className="caption">Estimated price will be</p>
          <p className="result__figure num" id="estimate-figure">Sample {money(result.freight)}</p>
          <p className="body-sm muted" id="estimate-basis">
            {result.service === 'barrel'
              ? `1 barrel to ${DEST[result.destination]}. Pickup cost quoted separately by the office.`
              : `${result.weight} kg, ${LABEL[result.service]}, to ${DEST[result.destination]}.`}
          </p>
          <p className="sample-note" id="estimate-note">
            Sample figure for design review. The live figure comes from the client rate card, and the estimate is confirmed by the office before booking.
          </p>
        </div>
      )}

      {!result && (
        <div className="result" id="quote-result" role="status" aria-live="polite">
          <p className="caption">Estimated price will be</p>
          <p className="result__figure num" id="estimate-figure">Sample US$285</p>
          <p className="body-sm muted" id="estimate-basis">40 kg to Lagos, standard air freight, one consignment.</p>
          <p className="sample-note" id="estimate-note">
            Sample figure for design review. The live figure comes from the client rate card, and the estimate is confirmed by the office before booking.
          </p>
        </div>
      )}
    </form>
  );
}
