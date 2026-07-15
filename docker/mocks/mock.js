const express = require('express');
const promClient = require('prom-client');
const axios = require('axios');
const { trace, context, SpanStatusCode } = require('@opentelemetry/api');
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { SimpleSpanProcessor, ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

const app = express();
const port = 8080;

const serviceName = process.env.SERVICE_NAME || 'unknown-service';
const errorRate = parseFloat(process.env.ERROR_RATE || '0.1');
const latencyMax = parseInt(process.env.LATENCY_MAX || '500', 10);
const lokiUrl = process.env.LOKI_URL || 'http://loki:3100/loki/api/v1/push';
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318/v1/traces';

// OpenTelemetry Setup
const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  }),
});
const traceExporter = new OTLPTraceExporter({
  url: 'http://otel-collector:4318/v1/traces',
});
provider.addSpanProcessor(new SimpleSpanProcessor(traceExporter));
provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
provider.register();

const tracer = trace.getTracer(serviceName);

// Prometheus setup
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register, prefix: 'node_' });

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['service_name', 'status', 'route'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});
register.registerMetric(httpRequestDuration);

const systemMemoryUsage = new promClient.Gauge({
  name: 'system_memory_usage_bytes',
  help: 'System memory usage in bytes',
  labelNames: ['service_name'],
  registers: [register]
});
register.registerMetric(systemMemoryUsage);

const systemCpuUsage = new promClient.Gauge({
  name: 'system_cpu_usage_percentage',
  help: 'System CPU usage percentage',
  labelNames: ['service_name'],
  registers: [register]
});
register.registerMetric(systemCpuUsage);

async function sendLogToLoki(message, level) {
  try {
    const timeNs = (Date.now() * 1000000).toString();
    await axios.post(lokiUrl, {
      streams: [{
        stream: { service: serviceName, level: level },
        values: [[timeNs, message]]
      }]
    }, { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Failed to send log to Loki:', err.message);
  }
}

// State for memory leak
let currentMemoryBytes = 100 * 1024 * 1024; // start at 100MB

// Simulate traffic
setInterval(async () => {
  console.log(`Generating traffic for ${serviceName}...`);
  const isError = Math.random() < errorRate;
  let status = isError ? '500' : '200';
  let durationMs = Math.random() * latencyMax;
  
  if (serviceName === 'frontend-web') {
    // Force N+1 scenario: 4.5s latency, 500 error maybe sometimes, but mostly just high latency
    durationMs = 4200 + (Math.random() * 600); // 4.2s - 4.8s
    status = '200'; // high latency but succeeds
    
    // Generate N+1 Trace
    const now = Date.now();
    const startTime = now - 4500;
    
    const parentSpan = tracer.startSpan('GET /api/checkout', { startTime });
    parentSpan.setAttribute('http.method', 'GET');
    parentSpan.setAttribute('http.route', '/api/checkout');
    parentSpan.setAttribute('http.status_code', status);
    
    // Simulate 54 sequential DB calls within that 4.5s window
    let currentDbStartTime = startTime + 100; // start 100ms after parent
    
    context.with(trace.setSpan(context.active(), parentSpan), () => {
      for (let i = 0; i < 54; i++) {
        const dbSpan = tracer.startSpan('SELECT * FROM users_cart', { startTime: currentDbStartTime });
        dbSpan.setAttribute('db.system', 'postgresql');
        dbSpan.setAttribute('db.statement', 'SELECT * FROM users_cart WHERE user_id = $1');
        
        const dbDuration = 80; // 80ms
        dbSpan.end(currentDbStartTime + dbDuration);
        currentDbStartTime += dbDuration;
      }
    });
    
    parentSpan.end(now);
  } else {
    // Generate normal Trace
    tracer.startActiveSpan(`GET /api/${serviceName}`, (span) => {
      span.setAttribute('http.status_code', status);
      if (isError) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Internal Server Error' });
      }
      setTimeout(() => span.end(), durationMs);
    });
  }

  httpRequestDuration.labels(serviceName, status, serviceName === 'frontend-web' ? '/api/checkout' : '/api/endpoint').observe(durationMs / 1000);
  
  // Simulate memory and CPU
  if (serviceName === 'qa-login') {
    currentMemoryBytes += (Math.random() * 5 * 1024 * 1024);
    if (currentMemoryBytes > 250 * 1024 * 1024) {
       currentMemoryBytes = 100 * 1024 * 1024;
       sendLogToLoki('OOMKilled: memory limit exceeded. Container restarting.', 'ERROR');
    }
    systemMemoryUsage.labels(serviceName).set(currentMemoryBytes);
    systemCpuUsage.labels(serviceName).set(10 + (Math.random() * 20));
  } else if (serviceName === 'payment-api') {
    systemMemoryUsage.labels(serviceName).set(200 * 1024 * 1024);
    const isCpuSpike = Math.random() < 0.1;
    systemCpuUsage.labels(serviceName).set(isCpuSpike ? 95 : 15 + (Math.random() * 10));
  } else if (serviceName === 'frontend-web') {
    // High CPU due to N+1
    systemMemoryUsage.labels(serviceName).set(180 * 1024 * 1024);
    systemCpuUsage.labels(serviceName).set(90 + (Math.random() * 10)); // 90-100%
  } else {
    systemMemoryUsage.labels(serviceName).set(150 * 1024 * 1024 + (Math.random() * 10 * 1024 * 1024));
    systemCpuUsage.labels(serviceName).set(20 + (Math.random() * 15));
  }
  
  if (isError && serviceName !== 'frontend-web') {
    let errorMsg = `Exception in ${serviceName}: Processing failed due to internal error.`;
    if (serviceName === 'qa-login') {
      errorMsg = `LoginException in qa-login: Session store retrieval failure. Redis connection timeout after 5000ms.`;
    } else if (serviceName === 'payment-api') {
      errorMsg = `GatewayException in payment-api: External API latency spike detected. Connection pool exhausted.`;
    } else if (serviceName === 'order-worker') {
      errorMsg = `KafkaException in order-worker: Consumer group falling behind. Partition rebalance stalled processing.`;
    }
    await sendLogToLoki(errorMsg, 'ERROR');
  } else {
    await sendLogToLoki(`Request to ${serviceName} succeeded.`, 'INFO');
  }
}, 2000);

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(port, () => {
  console.log(`${serviceName} listening on port ${port}`);
  sendLogToLoki(`Service ${serviceName} started`, 'INFO');
});
