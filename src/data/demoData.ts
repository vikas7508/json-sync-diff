import { Instance, InstanceData } from '@/store/slices/instancesSlice';
import { ComparisonSession } from '@/store/slices/comparisonSlice';

export const demoInstances: Instance[] = [
  {
    id: 'prod-001',
    name: 'Production',
    url: 'https://api.production.example.com',
    authKey: 'prod_key_abc123',
    isActive: true,
    status: 'connected',
    lastSync: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
  },
  {
    id: 'staging-001',
    name: 'Staging',
    url: 'https://api.staging.example.com',
    authKey: 'staging_key_def456',
    isActive: true,
    status: 'connected',
    lastSync: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
  },
  {
    id: 'dev-001',
    name: 'Development',
    url: 'https://api.dev.example.com',
    authKey: 'dev_key_ghi789',
    isActive: true,
    status: 'connected',
    lastSync: new Date(Date.now() - 1 * 60 * 1000).toISOString(), // 1 minute ago
  },
  {
    id: 'test-001',
    name: 'Test Environment',
    url: 'https://api.test.example.com',
    authKey: 'test_key_jkl012',
    isActive: false,
    status: 'disconnected',
  },
];

export const demoInstanceData: Record<string, InstanceData> = {
  'prod-001': {
    instanceId: 'prod-001',
    timestamp: new Date().toISOString(),
    data: {
      database: {
        host: 'prod-db.example.com',
        port: 5432,
        ssl: true,
        maxConnections: 100,
        timeout: 30000,
      },
      cache: {
        provider: 'redis',
        host: 'prod-cache.example.com',
        port: 6379,
        ttl: 3600,
        maxMemory: '2gb',
      },
      logging: {
        level: 'warn',
        format: 'json',
        destinations: ['file', 'elasticsearch'],
        retention: '30d',
      },
      features: {
        newDashboard: true,
        advancedReports: true,
        betaFeatures: false,
        maintenanceMode: false,
      },
      api: {
        rateLimit: 1000,
        timeout: 10000,
        cors: ['https://app.example.com'],
        versioning: 'v2',
      },
    },
  },
  'staging-001': {
    instanceId: 'staging-001',
    timestamp: new Date().toISOString(),
    data: {
      database: {
        host: 'staging-db.example.com',
        port: 5432,
        ssl: true,
        maxConnections: 50,
        timeout: 30000,
      },
      cache: {
        provider: 'redis',
        host: 'staging-cache.example.com',
        port: 6379,
        ttl: 1800,
        maxMemory: '1gb',
      },
      logging: {
        level: 'info',
        format: 'json',
        destinations: ['file', 'console'],
        retention: '7d',
      },
      features: {
        newDashboard: true,
        advancedReports: false,
        betaFeatures: true,
        maintenanceMode: false,
      },
      api: {
        rateLimit: 500,
        timeout: 15000,
        cors: ['https://staging.app.example.com', 'http://localhost:3000'],
        versioning: 'v2',
      },
    },
  },
  'dev-001': {
    instanceId: 'dev-001',
    timestamp: new Date().toISOString(),
    data: {
      database: {
        host: 'dev-db.example.com',
        port: 5432,
        ssl: false,
        maxConnections: 20,
        timeout: 60000,
      },
      cache: {
        provider: 'memory',
        host: 'localhost',
        port: 6379,
        ttl: 900,
        maxMemory: '512mb',
      },
      logging: {
        level: 'debug',
        format: 'pretty',
        destinations: ['console'],
        retention: '3d',
      },
      features: {
        newDashboard: true,
        advancedReports: true,
        betaFeatures: true,
        maintenanceMode: false,
      },
      api: {
        rateLimit: 100,
        timeout: 30000,
        cors: ['*'],
        versioning: 'v1',
      },
    },
  },
};

export const demoComparisonSessions: ComparisonSession[] = [
  {
    id: 'comp-001',
    name: 'Production vs Staging Configuration',
    instanceIds: ['prod-001', 'staging-001'],
    endpoint: '/api/settings',
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
    results: [
      {
        path: 'database.maxConnections',
        type: 'edited',
        leftValue: 100,
        rightValue: 50,
        description: 'Max connections differs between Production (100) and Staging (50)',
      },
      {
        path: 'cache.ttl',
        type: 'edited',
        leftValue: 3600,
        rightValue: 1800,
        description: 'Cache TTL differs: Production has 3600s, Staging has 1800s',
      },
      {
        path: 'cache.maxMemory',
        type: 'edited',
        leftValue: '2gb',
        rightValue: '1gb',
        description: 'Cache memory limit differs between environments',
      },
      {
        path: 'logging.level',
        type: 'edited',
        leftValue: 'warn',
        rightValue: 'info',
        description: 'Logging level differs: Production uses warn, Staging uses info',
      },
      {
        path: 'logging.destinations',
        type: 'edited',
        leftValue: ['file', 'elasticsearch'],
        rightValue: ['file', 'console'],
        description: 'Logging destinations differ between environments',
      },
      {
        path: 'features.advancedReports',
        type: 'edited',
        leftValue: true,
        rightValue: false,
        description: 'Advanced reports feature disabled in Staging',
      },
      {
        path: 'features.betaFeatures',
        type: 'edited',
        leftValue: false,
        rightValue: true,
        description: 'Beta features enabled in Staging but disabled in Production',
      },
      {
        path: 'api.rateLimit',
        type: 'edited',
        leftValue: 1000,
        rightValue: 500,
        description: 'Rate limit is higher in Production (1000) vs Staging (500)',
      },
      {
        path: 'api.cors',
        type: 'edited',
        leftValue: ['https://app.example.com'],
        rightValue: ['https://staging.app.example.com', 'http://localhost:3000'],
        description: 'CORS settings differ between environments',
      },
    ],
    summary: {
      totalDifferences: 9,
      added: 0,
      deleted: 0,
      edited: 9,
    },
  },
  {
    id: 'comp-002',
    name: 'Development Environment Analysis',
    instanceIds: ['prod-001', 'dev-001'],
    endpoint: '/api/settings',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    results: [
      {
        path: 'database.ssl',
        type: 'edited',
        leftValue: true,
        rightValue: false,
        description: 'SSL disabled in Development environment',
      },
      {
        path: 'database.maxConnections',
        type: 'edited',
        leftValue: 100,
        rightValue: 20,
        description: 'Significantly fewer connections allowed in Development',
      },
      {
        path: 'cache.provider',
        type: 'edited',
        leftValue: 'redis',
        rightValue: 'memory',
        description: 'Development uses in-memory cache instead of Redis',
      },
      {
        path: 'logging.level',
        type: 'edited',
        leftValue: 'warn',
        rightValue: 'debug',
        description: 'Debug logging enabled in Development',
      },
      {
        path: 'logging.format',
        type: 'edited',
        leftValue: 'json',
        rightValue: 'pretty',
        description: 'Pretty formatting used in Development for readability',
      },
      {
        path: 'api.rateLimit',
        type: 'edited',
        leftValue: 1000,
        rightValue: 100,
        description: 'Much lower rate limit in Development environment',
      },
      {
        path: 'api.cors',
        type: 'edited',
        leftValue: ['https://app.example.com'],
        rightValue: ['*'],
        description: 'CORS allows all origins in Development',
      },
      {
        path: 'api.versioning',
        type: 'edited',
        leftValue: 'v2',
        rightValue: 'v1',
        description: 'Development still using API v1',
      },
    ],
    summary: {
      totalDifferences: 8,
      added: 0,
      deleted: 0,
      edited: 8,
    },
  },
];

export const demoCodeTableData: Record<string, InstanceData> = {
  'prod-001': {
    instanceId: 'prod-001',
    timestamp: new Date().toISOString(),
    data: {
      userRoles: [
        { id: 1, name: 'admin', permissions: ['read', 'write', 'delete'] },
        { id: 2, name: 'editor', permissions: ['read', 'write'] },
        { id: 3, name: 'viewer', permissions: ['read'] },
      ],
      statusCodes: [
        { code: 'ACTIVE', description: 'User is active', color: '#22c55e' },
        { code: 'INACTIVE', description: 'User is inactive', color: '#ef4444' },
        { code: 'PENDING', description: 'User activation pending', color: '#f59e0b' },
      ],
      countries: [
        { code: 'US', name: 'United States', currency: 'USD' },
        { code: 'CA', name: 'Canada', currency: 'CAD' },
        { code: 'UK', name: 'United Kingdom', currency: 'GBP' },
      ],
    },
  },
  'staging-001': {
    instanceId: 'staging-001',
    timestamp: new Date().toISOString(),
    data: {
      userRoles: [
        { id: 1, name: 'admin', permissions: ['read', 'write', 'delete'] },
        { id: 2, name: 'editor', permissions: ['read', 'write'] },
        { id: 3, name: 'viewer', permissions: ['read'] },
        { id: 4, name: 'guest', permissions: ['read'] }, // Added in staging
      ],
      statusCodes: [
        { code: 'ACTIVE', description: 'User is active', color: '#22c55e' },
        { code: 'INACTIVE', description: 'User is inactive', color: '#ef4444' },
        { code: 'PENDING', description: 'User activation pending', color: '#f59e0b' },
        { code: 'SUSPENDED', description: 'User is suspended', color: '#8b5cf6' }, // Added in staging
      ],
      countries: [
        { code: 'US', name: 'United States', currency: 'USD' },
        { code: 'CA', name: 'Canada', currency: 'CAD' },
        { code: 'UK', name: 'United Kingdom', currency: 'GBP' },
        { code: 'DE', name: 'Germany', currency: 'EUR' }, // Added in staging
      ],
    },
  },
};