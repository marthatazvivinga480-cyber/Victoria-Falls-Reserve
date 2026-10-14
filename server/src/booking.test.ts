import { describe, it, expect } from 'vitest';
import { overlaps, validateStay, cancellationPolicy } from './services/booking.js';
describe('Stay rules', () => {
  it('allows same-day booking, one and thirty nights', () => {
    expect(validateStay('2030-01-01', '2030-01-02', '2030-01-01')).toBe(1);
    expect(validateStay('2030-01-01', '2030-01-31', '2030-01-01')).toBe(30);
  });
  it('rejects past, reversed, zero and >30 nights', () => {
    for (const [a, b] of [
      ['2029-12-31', '2030-01-02'],
      ['2030-01-02', '2030-01-01'],
      ['2030-01-01', '2030-01-01'],
      ['2030-01-01', '2030-02-01'],
    ])
      expect(() => validateStay(a, b, '2030-01-01')).toThrow();
  });
  it('uses half-open intervals for turnaround', () => {
    expect(overlaps('2030-01-01', '2030-01-03', '2030-01-03', '2030-01-05')).toBe(false);
    expect(overlaps('2030-01-01', '2030-01-03', '2030-01-02', '2030-01-05')).toBe(true);
    expect(overlaps('2030-01-01', '2030-01-05', '2030-01-02', '2030-01-03')).toBe(true);
  });
});
describe('Cancellation policy', () => {
  const cutoff = Date.parse('2030-01-08T14:00:00+02:00');
  it('refunds fully at exactly 48 hours', () =>
    expect(cancellationPolicy('2030-01-10', 600, 200, cutoff)).toEqual({ charge: 0, refund: 600 }));
  it('charges one night after cutoff', () =>
    expect(cancellationPolicy('2030-01-10', 600, 200, cutoff + 1)).toEqual({
      charge: 200,
      refund: 400,
    }));
  it('no-show is non-refundable', () =>
    expect(cancellationPolicy('2030-01-10', 600, 200, cutoff, true)).toEqual({
      charge: 600,
      refund: 0,
    }));
});
