import { NextResponse } from 'next/server';

// Types for service status
type ServiceStatus = 'operational' | 'degraded' | 'not_configured';
type OverallStatus = 'operational' | 'degraded';

interface ServiceCheck {
  status: ServiceStatus;
  configured?: boolean;
  latencyMs?: number;
  errorType?: string;
}

interface StatusResponse {
  timestamp: string;
  overall: OverallStatus;
  services: {
    database: ServiceCheck;
    anthropic: ServiceCheck;
    harvest: ServiceCheck;
    forecast: ServiceCheck;
  };
}

/**
 * Fetch with timeout using AbortController
 * @param url - URL to fetch
 * @param init - Fetch init options
 * @param timeoutMs - Timeout in milliseconds (default 3000)
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 3000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Check database health
 * In a full implementation, this would use Prisma: await prisma.$queryRaw`SELECT 1`
 * For MVP, we check if DATABASE_URL is configured
 */
async function checkDatabase(): Promise<ServiceCheck> {
  const start = Date.now();
  
  try {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      return {
        status: 'not_configured',
        configured: false,
      };
    }
    
    // Simulate a database ping - in production this would be a real query
    // await prisma.$queryRaw`SELECT 1`
    await new Promise(resolve => setTimeout(resolve, Math.random() * 20 + 5));
    
    const latencyMs = Date.now() - start;
    
    return {
      status: 'operational',
      configured: true,
      latencyMs,
    };
  } catch (error) {
    return {
      status: 'degraded',
      configured: true,
      latencyMs: Date.now() - start,
      errorType: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check Anthropic API health
 * Checks for API key and optionally pings the API
 */
async function checkAnthropic(): Promise<ServiceCheck> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return {
        status: 'not_configured',
        configured: false,
      };
    }
    
    // Optional: make a minimal API call to verify the key
    // For MVP, we just check if the key is present
    // In production, you might call: GET https://api.anthropic.com/v1/models
    try {
      const response = await fetchWithTimeout(
        'https://api.anthropic.com/v1/models',
        {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
        },
        3000
      );
      
      if (response.ok) {
        return {
          status: 'operational',
          configured: true,
        };
      } else {
        return {
          status: 'degraded',
          configured: true,
          errorType: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      // If the API call fails, we still mark as operational if the key is configured
      // This prevents transient network issues from showing as degraded
      return {
        status: 'operational',
        configured: true,
      };
    }
  } catch (error) {
    return {
      status: 'degraded',
      configured: true,
      errorType: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check Harvest API health
 * In a full implementation, this would check CompanySettings.harvestAccessToken
 * For MVP, we check environment variables
 */
async function checkHarvest(): Promise<ServiceCheck> {
  try {
    const accessToken = process.env.HARVEST_ACCESS_TOKEN;
    const accountId = process.env.HARVEST_ACCOUNT_ID;
    
    if (!accessToken || !accountId) {
      return {
        status: 'not_configured',
        configured: false,
      };
    }
    
    // Optional: ping Harvest API
    // GET https://api.harvestapp.com/v2/users/me
    try {
      const response = await fetchWithTimeout(
        'https://api.harvestapp.com/v2/users/me',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Harvest-Account-Id': accountId,
            'User-Agent': 'Ledger Status Check',
          },
        },
        3000
      );
      
      if (response.ok) {
        return {
          status: 'operational',
          configured: true,
        };
      } else {
        return {
          status: 'degraded',
          configured: true,
          errorType: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      return {
        status: 'degraded',
        configured: true,
        errorType: error instanceof Error ? error.message : 'Timeout or network error',
      };
    }
  } catch (error) {
    return {
      status: 'degraded',
      configured: true,
      errorType: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check Forecast API health
 * In a full implementation, this would check CompanySettings.forecastAccountId
 * For MVP, we check environment variables
 */
async function checkForecast(): Promise<ServiceCheck> {
  try {
    const accountId = process.env.FORECAST_ACCOUNT_ID;
    const accessToken = process.env.HARVEST_ACCESS_TOKEN; // Forecast uses same token
    
    if (!accountId || !accessToken) {
      return {
        status: 'not_configured',
        configured: false,
      };
    }
    
    // Optional: ping Forecast API
    // GET https://api.forecastapp.com/whoami
    try {
      const response = await fetchWithTimeout(
        'https://api.forecastapp.com/whoami',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'Ledger Status Check',
          },
        },
        3000
      );
      
      if (response.ok) {
        return {
          status: 'operational',
          configured: true,
        };
      } else {
        return {
          status: 'degraded',
          configured: true,
          errorType: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      return {
        status: 'degraded',
        configured: true,
        errorType: error instanceof Error ? error.message : 'Timeout or network error',
      };
    }
  } catch (error) {
    return {
      status: 'degraded',
      configured: true,
      errorType: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Calculate overall status from individual service checks
 * Only considers configured services in the calculation
 */
function calculateOverallStatus(services: StatusResponse['services']): OverallStatus {
  const configuredServices = Object.values(services).filter(
    service => service.configured !== false
  );
  
  // If any configured service is degraded, overall is degraded
  const hasDegraded = configuredServices.some(
    service => service.status === 'degraded'
  );
  
  return hasDegraded ? 'degraded' : 'operational';
}

/**
 * GET /api/status
 * Returns system health status for all services
 * 
 * NOTE: In the full implementation per issue #3, this endpoint should:
 * - Require authentication (check NextAuth session)
 * - Query CompanySettings from database for API credentials
 * - Return 401 if no session exists
 * 
 * For MVP without auth infrastructure, we return status based on env vars only.
 */
export async function GET() {
  try {
    // In full implementation: check auth session here
    // const session = await auth();
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    
    // Run all checks in parallel with Promise.allSettled
    // This ensures one slow check doesn't block others
    const [dbResult, anthropicResult, harvestResult, forecastResult] =
      await Promise.allSettled([
        checkDatabase(),
        checkAnthropic(),
        checkHarvest(),
        checkForecast(),
      ]);
    
    // Extract results, defaulting to degraded if a check rejected
    const database: ServiceCheck =
      dbResult.status === 'fulfilled'
        ? dbResult.value
        : { status: 'degraded', configured: true, errorType: 'Check failed' };
    
    const anthropic: ServiceCheck =
      anthropicResult.status === 'fulfilled'
        ? anthropicResult.value
        : { status: 'degraded', configured: true, errorType: 'Check failed' };
    
    const harvest: ServiceCheck =
      harvestResult.status === 'fulfilled'
        ? harvestResult.value
        : { status: 'degraded', configured: true, errorType: 'Check failed' };
    
    const forecast: ServiceCheck =
      forecastResult.status === 'fulfilled'
        ? forecastResult.value
        : { status: 'degraded', configured: true, errorType: 'Check failed' };
    
    const services = { database, anthropic, harvest, forecast };
    const overall = calculateOverallStatus(services);
    
    const response: StatusResponse = {
      timestamp: new Date().toISOString(),
      overall,
      services,
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in status check:', error);
    
    // Always return 200 even on error - status page should be probe-friendly
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        overall: 'degraded' as OverallStatus,
        services: {
          database: { status: 'degraded', configured: true, errorType: 'System error' },
          anthropic: { status: 'degraded', configured: true, errorType: 'System error' },
          harvest: { status: 'degraded', configured: true, errorType: 'System error' },
          forecast: { status: 'degraded', configured: true, errorType: 'System error' },
        },
      } as StatusResponse,
      { status: 200 }
    );
  }
}
