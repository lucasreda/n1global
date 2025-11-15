import { describe, it, expect } from '@jest/globals';
import { mapProviderStatus } from '../staging-sync-service';

describe('mapProviderStatus - Big Arena integration', () => {
  it('should map Big Arena shipment statuses to internal statuses', () => {
    expect(mapProviderStatus('ready_to_ship', 'big_arena')).toBe('processing');
    expect(mapProviderStatus('ready-to-ship', 'big_arena')).toBe('processing');
    expect(mapProviderStatus('packing', 'big_arena')).toBe('processing');
    expect(mapProviderStatus('picked', 'big_arena')).toBe('processing');
  });

  it('should map transit statuses to shipped', () => {
    expect(mapProviderStatus('in_transit', 'big_arena')).toBe('shipped');
    expect(mapProviderStatus('in-transit', 'big_arena')).toBe('shipped');
  });

  it('should preserve delivered and returned statuses', () => {
    expect(mapProviderStatus('delivered', 'big_arena')).toBe('delivered');
    expect(mapProviderStatus('partial_return', 'big_arena')).toBe('returned');
  });

  it('should fallback to pending for unknown statuses', () => {
    expect(mapProviderStatus('unknown_status', 'big_arena')).toBe('pending');
    expect(mapProviderStatus('', 'big_arena')).toBe('pending');
    expect(mapProviderStatus(undefined as unknown as string, 'big_arena')).toBe('pending');
  });
});

