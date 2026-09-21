import { useState } from 'react';

const STATUS_LABELS = {
  received: 'Received',
  processed: 'Processed',
  in_transit: 'In transit',
  clearance: 'Clearance',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
};

export default function TrackingLookup({ compact = false }) {
  const [trackingId, setTrackingId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!trackingId.trim()) {
      setError('Enter a tracking number to look up your shipment.');
      return;
    }
    setError('');
    setResult(null);
    setLoading(true);

    try {
      // Try direct call to WordPress endpoint first
      let data;
      try {
        const res = await fetch(
          `https://grandbelleinternational.com/wp-json/gbcm/v1/track/${encodeURIComponent(trackingId.trim())}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        if (res.ok) {
          data = await res.json();
        }
      } catch (_) {
        // CORS or network error — try via Cloudflare Pages Function
      }

      // Fallback: Cloudflare Pages Function proxy
      if (!data) {
        try {
          const res = await fetch(`/api/track?id=${encodeURIComponent(trackingId.trim())}`);
          if (res.ok) data = await res.json();
        } catch (_) {}
      }

      if (data) {
        setResult(data);
      } else {
        setError('No result found for that tracking number. Check the number and try again.');
      }
    } catch (err) {
      setError('Could not reach the tracking service. Please try again shortly.');
    } finally {
      setLoading(false);
    }
  }

  const statusLabel = result?.status ? STATUS_LABELS[result.status] || result.status : null;

  if (compact) {
    return (
      <form method="get" action="#tracking" role="search" onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="field">
            <input
              className="input"
              type="text"
              value={trackingId}
              onChange={e => setTrackingId(e.target.value)}
              placeholder="Enter your tracking number"
              aria-label="Tracking number"
            />
          </div>
          <button className="btn btn--secondary" type="submit" disabled={loading}>
            {loading ? '...' : 'Track'}
          </button>
        </div>
        {error && <p className="field__error" style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontSize: '0.875rem', color: '#A33200' }}>{error}</p>}
      </form>
    );
  }

  return (
    <div className="stack">
      <form method="get" action="#tracking" role="search" onSubmit={handleSubmit} className="stack">
        <label className="field__label" htmlFor="tracking-input">Track your shipment</label>
        <div className="form-row">
          <div className="field">
            <input
              className="input"
              id="tracking-input"
              type="text"
              value={trackingId}
              onChange={e => setTrackingId(e.target.value)}
              placeholder="Enter your tracking number"
              autoComplete="off"
            />
          </div>
          <button className="btn btn--primary" type="submit" disabled={loading}>
            {loading ? 'Looking up...' : 'Track'}
          </button>
        </div>
      </form>

      {error && (
        <p className="field__error" style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontSize: '0.875rem', color: '#A33200' }}>
          {error}
        </p>
      )}

      {result && (
        <div className="card" style={{ marginTop: '0' }}>
          <h3 className="h4" style={{ marginBottom: '16px' }}>Shipment status</h3>
          <dl style={{ display: 'grid', gap: '8px' }}>
            {result.tracking_number && (
              <>
                <dt className="label">Tracking number</dt>
                <dd className="body-sm" style={{ margin: 0 }}>{result.tracking_number}</dd>
              </>
            )}
            {statusLabel && (
              <>
                <dt className="label">Status</dt>
                <dd className="body-sm" style={{ margin: 0 }}>{statusLabel}</dd>
              </>
            )}
            {result.location && (
              <>
                <dt className="label">Location</dt>
                <dd className="body-sm" style={{ margin: 0 }}>{result.location}</dd>
              </>
            )}
            {result.last_update && (
              <>
                <dt className="label">Last update</dt>
                <dd className="body-sm" style={{ margin: 0 }}>{result.last_update}</dd>
              </>
            )}
          </dl>
        </div>
      )}

      {!result && !error && !loading && (
        <p className="body-sm muted">No login required. The tracking number is on the receipt we send when a consignment is received.</p>
      )}
    </div>
  );
}
