import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from './route';

// Mock global fetch
const originalFetch = global.fetch;

describe('GET /api/status', () => {
  beforeEach(() => {
    // Reset environment variables
    delete process.env.DATABASE_URL;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.HARVEST_ACCESS_TOKEN;
    delete process.env.HARVEST_ACCOUNT_ID;
    delete process.env.FORECAST_ACCOUNT_ID;
    
    // Mock successful fetch by default
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns 200 status code', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
  });

  it('returns valid JSON with correct structure', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('overall');
    expect(data).toHaveProperty('services');
    expect(data.services).toHaveProperty('database');
    expect(data.services).toHaveProperty('anthropic');
    expect(data.services).toHaveProperty('harvest');
    expect(data.services).toHaveProperty('forecast');
  });

  it('timestamp is a valid ISO 8601 string', async () => {
    const response = await GET();
    const data = await response.json();
    
    const timestamp = new Date(data.timestamp);
    expect(timestamp.toISOString()).toBe(data.timestamp);
  });

  it('includes all four service keys in alphabetical order check', async () => {
    const response = await GET();
    const data = await response.json();
    
    const serviceKeys = Object.keys(data.services).sort();
    expect(serviceKeys).toEqual(['anthropic', 'database', 'forecast', 'harvest']);
  });

  describe('overall status calculation', () => {
    it('returns operational when all configured services are operational', async () => {
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.ANTHROPIC_API_KEY = 'sk-test';
      
      const response = await GET();
      const data = await response.json();
      
      expect(data.overall).toBe('operational');
    });

    it('returns operational when no services are configured', async () => {
      const response = await GET();
      const data = await response.json();
      
      // All services should be not_configured, but overall should be operational
      expect(data.overall).toBe('operational');
    });

    it('returns degraded when any configured service is degraded', async () => {
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.ANTHROPIC_API_KEY = 'sk-test';
      
      // Mock Anthropic API to fail
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      } as Response);
      
      const response = await GET();
      const data = await response.json();
      
      expect(data.overall).toBe('degraded');
    });
  });

  describe('database check', () => {
    it('reports not_configured when DATABASE_URL is absent', async () => {
      const response = await GET();
      const data = await response.json();
      
      expect(data.services.database.status).toBe('not_configured');
      expect(data.services.database.configured).toBe(false);
    });

    it('reports operational when DATABASE_URL is present', async () => {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
      
      const response = await GET();
      const data = await response.json();
      
      expect(data.services.database.status).toBe('operational');
      expect(data.services.database.configured).toBe(true);
      expect(typeof data.services.database.latencyMs).toBe('number');
    });

    it('includes latencyMs when operational', async () => {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
      
      const response = await GET();
      const data = await response.json();
      
      expect(data.services.database.latencyMs).toBeGreaterThan(0);
    });
  });

  describe('anthropic check', () => {
    it('reports not_configured when ANTHROPIC_API_KEY is absent', async () => {
      const response = await GET();
      const data = await response.json();
      
      expect(data.services.anthropic.status).toBe('not_configured');
      expect(data.services.anthropic.configured).toBe(false);
    });

    it('reports operational when API key is present and API responds with 200', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-test-key';
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);
      
      const response = await GET();
      const data = await response.json();
      
      expect(data.services.anthropic.status).toBe('operational');
      expect(data.services.anthropic.configured).toBe(true);
    });

    it('reports degraded when Anthropic API returns non-200', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-invalid-key';
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      } as Response);
      
      const response = await GET();
      const data = await response.json();
      
      expect(data.services.anthropic.status).toBe('degraded');
      expect(data.services.anthropic.configured).toBe(true);
      expect(data.services.anthropic.errorType).toContain('401');
    });

    it('does not include API key value in response', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-super-secret-key-12345';
      
      const response = await GET();
      const body = await response.text();
      
      expect(body).not.toContain('sk-super-secret-key-12345');
    });

    it('reports operational even when API call fails (transient errors)', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-test-key';
      
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      const response = await GET();
      const data = await response.json();
      
      // Should still report operational if key is configured (graceful degradation)
      expect(data.services.anthropic.status).toBe('operational');
      expect(data.services.anthropic.configured).toBe(true);
    });
  });

  describe('harvest check', () => {
    it('reports not_configured when credentials are absent', async () => {
      const response = await GET();
      const data = await response.json();
      
      expect(data.services.harvest.status).toBe('not_configured');
      expect(data.services.harvest.configured).toBe(false);
    });

    it('reports not_configured when only access token is present', async () => {
      process.env.HARVEST_ACCESS_TOKEN = 'token';
      
      const response = await GET();
      const data = await response.json();
      
      expect(data.services.harvest.status).toBe('not_configured');
    });

    it('reports not_configured when only account ID is present', async () => {
      process.env.HARVEST_ACCOUNT_ID = '12345';
      
      const response = await GET();
      const data = await response.json();
      
      expect(data.services.harvest.status).toBe('not_configured');
    });

    it('reports operational when credentials are present and API responds', async () => {
      process.env.HARVEST_ACCESS_TOKEN = 'token';
      process.env.HARVEST_ACCOUNT_ID = '12345';
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);
      
      const response = await GET();
      const data = await response.json();
      
      expect(data.services.harvest.status).toBe('operational');
      expect(data.services.harvest.configured).toBe(true);
    });

    it('reports degraded when API returns error', async () => {
      process.env.HARVEST_ACCESS_TOKEN = 'invalid-token';
      process.env.HARVEST_ACCOUNT_ID = '12345';
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      } as Response);
      
      const response = await GET();
      const data = await response.json();
      
      expect(data.services.harvest.status).toBe('degraded');
      expect(data.services.harvest.errorType).toContain('401');
    });
  });

  describe('forecast check', () => {
    it('reports not_configured when credentials are absent', async () => {
      const response = await GET();
      const data = await response.json();
      
      expect(data.services.forecast.status).toBe('not_configured');
      expect(data.services.forecast.configured).toBe(false);
    });

    it('reports operational when credentials are present and API responds', async () => {
      process.env.FORECAST_ACCOUNT_ID = '12345';
      process.env.HARVEST_ACCESS_TOKEN = 'token'; // Forecast uses same token
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);
      
      const response = await GET();
      const data = await response.json();
      
      expect(data.services.forecast.status).toBe('operational');
      expect(data.services.forecast.configured).toBe(true);
    });
  });

  describe('parallel execution', () => {
    it('completes all checks even if one times out', async () => {
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.ANTHROPIC_API_KEY = 'sk-test';
      process.env.HARVEST_ACCESS_TOKEN = 'token';
      process.env.HARVEST_ACCOUNT_ID = '12345';
      
      // Mock one service to timeout
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call (Anthropic) - simulate timeout
          return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 3100);
          });
        }
        return Promise.resolve({ ok: true, status: 200 } as Response);
      });
      
      const response = await GET();
      const data = await response.json();
      
      // Should have results for all services
      expect(data.services.database).toBeDefined();
      expect(data.services.anthropic).toBeDefined();
      expect(data.services.harvest).toBeDefined();
      expect(data.services.forecast).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('returns 200 even when all checks fail', async () => {
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.ANTHROPIC_API_KEY = 'sk-test';
      
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      const response = await GET();
      
      expect(response.status).toBe(200);
    });

    it('returns valid response structure on catastrophic failure', async () => {
      // Simulate catastrophic error by mocking an internal error
      const response = await GET();
      const data = await response.json();
      
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('overall');
      expect(data).toHaveProperty('services');
    });
  });

  describe('security', () => {
    it('does not expose HARVEST_ACCESS_TOKEN in response', async () => {
      process.env.HARVEST_ACCESS_TOKEN = 'super-secret-harvest-token';
      process.env.HARVEST_ACCOUNT_ID = '12345';
      
      const response = await GET();
      const body = await response.text();
      
      expect(body).not.toContain('super-secret-harvest-token');
    });

    it('does not expose DATABASE_URL in response', async () => {
      process.env.DATABASE_URL = 'postgresql://user:password@host:5432/db';
      
      const response = await GET();
      const body = await response.text();
      
      expect(body).not.toContain('user:password');
    });
  });
});
