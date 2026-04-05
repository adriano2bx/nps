import axios from 'axios';
import pLimit from 'p-limit';
import crypto from 'crypto';

/**
 * NPS Health - Massive API Load Tester
 * Usage: 
 *   export API_URL=https://nps.2bx.com.br
 *   export API_KEY=TENANT_ID.SECRET
 *   npx tsx scripts/load-test.ts
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';
const API_KEY = process.env.API_KEY;
const TOTAL_REQUESTS = parseInt(process.env.TOTAL || '100');
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '10');
const SCENARIO = process.env.SCENARIO || 'mixed'; // mixed, upsert, stats, campaigns

if (!API_KEY) {
  console.error('❌ Error: API_KEY is required. Set it via environment variable.');
  process.exit(1);
}

const limit = pLimit(CONCURRENCY);

const stats = {
  total: 0,
  success: 0,
  error: 0,
  latency: [] as number[],
  statusCodes: {} as Record<number, number>
};

function generateRandomPhone() {
  const digits = Math.floor(100000000 + Math.random() * 900000000);
  return `55119${digits}`;
}

async function runScenario(id: number) {
  const startTime = Date.now();
  let endpoint = '';
  let method: 'GET' | 'POST' = 'GET';
  let body: any = null;

  // Choose scenario
  const s = SCENARIO === 'mixed' ? ['upsert', 'stats', 'campaigns'][Math.floor(Math.random() * 3)] : SCENARIO;

  switch (s) {
    case 'upsert':
      endpoint = '/api/v1/contacts/upsert';
      method = 'POST';
      body = {
        name: `Test User ${id}`,
        phoneNumber: generateRandomPhone(),
        segmentNames: ['LoadTest', 'MassiveAudit']
      };
      break;
    case 'stats':
      endpoint = '/api/v1/metrics/nps';
      method = 'GET';
      break;
    case 'campaigns':
      endpoint = '/api/v1/campaigns';
      method = 'GET';
      break;
    case 'trigger':
      // DANGEROUS scenario - included for completeness
      endpoint = '/api/v1/trigger';
      method = 'POST';
      body = {
        campaignId: process.env.CAMPAIGN_ID || 'CAMPAIGN_ID_REQUIRED',
        phoneNumber: generateRandomPhone(),
        contactName: `Trigger Test ${id}`
      };
      break;
  }

  try {
    const config = {
      headers: { 'X-API-KEY': API_KEY }
    };

    const url = `${API_URL}${endpoint}`;
    
    let res;
    if (method === 'GET') {
      res = await axios.get(url, config);
    } else {
      res = await axios.post(url, body, config);
    }

    const duration = Date.now() - startTime;
    stats.success++;
    stats.latency.push(duration);
    stats.statusCodes[res.status] = (stats.statusCodes[res.status] || 0) + 1;
    
    if (id % 10 === 0) {
       console.log(`[Progress] ✅ Request ${id}/${TOTAL_REQUESTS} | ${s.toUpperCase()} | ${duration}ms`);
    }

  } catch (error: any) {
    stats.error++;
    const code = error.response?.status || 0;
    stats.statusCodes[code] = (stats.statusCodes[code] || 0) + 1;
    console.error(`[Error] ❌ Request ${id} failed: ${error.message}${code ? ` (Status: ${code})` : ''}`);
  } finally {
    stats.total++;
  }
}

async function main() {
  console.log(`\n🚀 Starting Massive Load Test`);
  console.log(`-----------------------------`);
  console.log(`Target: ${API_URL}`);
  console.log(`Scenario: ${SCENARIO.toUpperCase()}`);
  console.log(`Volume: ${TOTAL_REQUESTS} total requests`);
  console.log(`Concurrency: ${CONCURRENCY} parallel workers`);
  console.log(`-----------------------------\n`);

  const startTime = Date.now();
  const tasks = [];

  for (let i = 1; i <= TOTAL_REQUESTS; i++) {
    tasks.push(limit(() => runScenario(i)));
  }

  await Promise.all(tasks);

  const totalTime = (Date.now() - startTime) / 1000;
  const avgLatency = stats.latency.length > 0 
    ? (stats.latency.reduce((a, b) => a + b, 0) / stats.latency.length).toFixed(2)
    : '0';

  console.log(`\n📊 Final Results`);
  console.log(`-----------------------------`);
  console.log(`Duration: ${totalTime.toFixed(2)}s`);
  console.log(`Success Rate: ${((stats.success / stats.total) * 100).toFixed(2)}% (${stats.success}/${stats.total})`);
  console.log(`Error Rate: ${((stats.error / stats.total) * 100).toFixed(2)}% (${stats.error}/${stats.total})`);
  console.log(`Average Latency: ${avgLatency}ms`);
  console.log(`Requests/sec: ${(stats.total / totalTime).toFixed(2)}`);
  console.log(`Status Codes:`, stats.statusCodes);
  console.log(`-----------------------------\n`);
}

main().catch(console.error);
