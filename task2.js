const dns = require('dns');
const { exec } = require('child_process');
const csv = require('csv-writer').createObjectCsvWriter;

const domains = ['apple.com', 'google.com', 'youtube.com'];

async function resolveDNS(domain) {
  return new Promise((resolve, reject) => {
    dns.lookup(domain, { family: 4 }, (err, address) => {
      if (err) reject(new Error(`DNS resolution failed: ${err.message}`));
      else resolve(address);
    });
  });
}

async function performTraceroute(ip) {
  return new Promise((resolve) => {
    exec(`traceroute -n -q 1 -m 15 ${ip}`, { timeout: 15000 }, (error, stdout, stderr) => {
      if (error) {
        resolve({
          error: 'Traceroute failed',
          details: stderr || error.message
        });
      } else {
        resolve({
          hops: parseTracerouteOutput(stdout),
          raw: stdout
        });
      }
    });
  });
}

function parseTracerouteOutput(output) {
  const hops = [];
  const lines = output.split('\n').slice(1);
  
  for (const line of lines) {
    const match = line.match(/\d+\s+(\d+\.\d+\.\d+\.\d+)/);
    if (match && match[1] && match[1] !== '0.0.0.0') {
      hops.push(match[1]);
    }
  }
  
  return hops;
}

async function main() {
  console.log('Начало обработки доменов...');
  
  const csvWriter = csv({
    path: 'traceroutes_results.csv',
    header: [
      {id: 'domain', title: 'DOMAIN'},
      {id: 'ip', title: 'IP_ADDRESS'},
      {id: 'hop_count', title: 'HOP_COUNT'},
      {id: 'hops', title: 'HOPS'},
      {id: 'raw_output', title: 'RAW_OUTPUT'}
    ]
  });
  
  const records = [];
  
  for (const domain of domains) {
    console.log(`Обработка домена: ${domain}`);
    
    try {
      const ip = await resolveDNS(domain);
      console.log(`  IP-адрес: ${ip}`);
      
      const traceResult = await performTraceroute(ip);
      
      if (traceResult.error) {
        console.error(`  Ошибка traceroute: ${traceResult.error}`);
        records.push({
          domain,
          ip,
          hop_count: 0,
          hops: 'ERROR',
          raw_output: traceResult.details || 'Unknown error'
        });
      } else {
        console.log(`  Найдено хопов: ${traceResult.hops.length}`);
        records.push({
          domain,
          ip,
          hop_count: traceResult.hops.length,
          hops: traceResult.hops.join(' -> '),
          raw_output: traceResult.raw
        });
      }
    } catch (err) {
      console.error(`  Ошибка: ${err.message}`);
      records.push({
        domain,
        ip: 'ERROR',
        hop_count: 0,
        hops: 'ERROR',
        raw_output: err.message
      });
    }
  }
  
  await csvWriter.writeRecords(records);
  console.log('Результаты сохранены в traceroutes_results.csv');
}

main().catch(err => {
  console.error('Фатальная ошибка:', err);
  process.exit(1);
});