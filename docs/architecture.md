# AiSignal Architecture Specification

AiSignal is built as a modern Next.js application that orchestrates an intelligent feedback loop between OpenAI's reasoning engine and your existing OpenTelemetry infrastructure.

## System Architecture

The following diagram illustrates the data flow from application telemetry to the final generated AiSignal postmortem.

```mermaid
flowchart TD
    %% Define Styles
    classDef app fill:#eef2ff,stroke:#6366f1,stroke-width:2px;
    classDef infra fill:#f0fdf4,stroke:#22c55e,stroke-width:2px;
    classDef ai fill:#fdf4ff,stroke:#d946ef,stroke-width:2px;
    classDef output fill:#fffbeb,stroke:#f59e0b,stroke-width:2px;

    subgraph User Applications
        App1[Service: QA-Login]
        App2[Service: Payment-API]
    end

    subgraph Observability Backend (OpenTelemetry Stack)
        OTel[OTel Collector]
        Prom[(Prometheus\nMetrics)]
        Loki[(Grafana Loki\nLogs)]
        Tempo[(Grafana Tempo\nTraces)]
        AlertM[Alertmanager]
    end

    subgraph AiSignal Platform (Next.js)
        Webhook[Webhook Receiver API]
        Planner[AI Query Planner\nLLM]
        Executor[Query Executor]
        Postmortem[AI Postmortem Engine\nLLM]
        UI[AiSignal Dashboard]
    end

    subgraph External Integrations
        Confluence[Confluence REST API]
        Slack[Slack / Teams]
    end

    %% Telemetry Flow
    App1 -->|Metrics, Logs, Traces| OTel
    App2 -->|Metrics, Logs, Traces| OTel
    OTel --> Prom & Loki & Tempo

    %% Alerting Flow
    Prom -->|Threshold Exceeded| AlertM
    AlertM -->|HTTP POST| Webhook

    %% AiSignal Logic Flow
    Webhook -->|Trigger| Planner
    UI -->|Natural Language Prompt| Planner
    
    Planner -->|Generates PromQL/LogQL| Executor
    Executor <-->|Fetches Raw JSON| Prom & Loki
    Executor -->|Passes Raw Data| Postmortem
    
    Postmortem -->|Generates RCA Report| UI
    Postmortem -->|Broadcast| Slack
    UI -->|Export| Confluence

    %% Apply Styles
    class App1,App2 app;
    class OTel,Prom,Loki,Tempo,AlertM infra;
    class Webhook,Planner,Executor,Postmortem,UI ai;
    class Confluence,Slack output;
```

## Architectural Components

### 1. OpenTelemetry Backend
AiSignal does not use proprietary agents. It relies on standard OpenTelemetry collectors to gather metrics, logs, and traces, routing them to Prometheus, Loki, and Tempo. This decoupled architecture allows you to drop AiSignal on top of your existing infrastructure with zero instrumentation changes.

### 2. Alertmanager Webhook Receiver
When Prometheus detects an anomaly, Alertmanager fires a webhook directly to AiSignal's `/api/alerts/webhook` route. This acts as the automated trigger for the Risk Analysis engine.

### 3. The AI Planner (`/api/ai/planner`)
The entry point for intelligence. Whether triggered by a webhook or a user's natural language prompt via the Ask dashboard, the AI Planner's job is strictly limited to translation. It uses OpenAI (GPT-4o) to translate the intent into a syntactically correct query plan containing PromQL and LogQL statements.

### 4. The Execution Engine (`/api/observability/execute`)
A deterministic Node.js service that runs the AI-generated queries against the Prometheus and Loki HTTP APIs. It formats the results into a standardized JSON structure. This separation of concerns prevents the LLM from executing arbitrary code.

### 5. The Postmortem Engine (`/api/ai/postmortem`)
The final intelligence layer. It receives the user's intent and the *raw data JSON* from the Executor. It is strictly prompted to base its analysis *only* on the provided data, virtually eliminating hallucination. It outputs a structured JSON report containing an executive summary, timelines, and root cause analysis, which the UI renders into interactive charts and markdown.
