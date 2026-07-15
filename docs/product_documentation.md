# AiSignal: Product Documentation

Welcome to AiSignal, the next-generation AI SRE platform. AiSignal bridges the gap between passive infrastructure telemetry and actionable intelligence by translating natural language into PromQL/LogQL, executing the queries, and automatically generating comprehensive incident postmortems.

## The Problem AiSignal Solves

Modern microservice architectures generate an overwhelming amount of telemetry data. When a critical incident occurs, Site Reliability Engineers (SREs) lose valuable minutes—often hours—switching between Grafana dashboards, constructing complex Prometheus queries, and hunting through Loki logs to find the root cause. This manual investigation leads to high Mean Time To Resolution (MTTR) and significant revenue loss during downtime.

AiSignal acts as an automated Level 1 Support Engineer. It instantly detects firing alerts and investigates them autonomously, providing your engineering team with a complete, data-backed incident report before they even open their laptops.

## Core Workflows

### 1. Risk Analysis (Automated RCA)
AiSignal integrates seamlessly with your existing Alertmanager pipelines. When an incident fires (e.g., Error Rate > 5%), AiSignal detects it in real-time without polling.
- **How it works**: Navigate to the **Risk Analysis** dashboard to see a list of live, unhealthy services. Click **Generate Postmortem**.
- **Under the hood**: AiSignal's AI Planner writes a multi-step query plan to investigate the root cause. The Execution Engine runs these queries against your backend. The Postmortem Engine then synthesizes the raw data into a strictly grounded, non-hallucinated executive report.

### 2. Ask Telemetry (Natural Language Queries)
You don't need to be a PromQL expert to investigate your systems. Business leaders, product managers, and junior developers can now interrogate production data using plain English.
- **How it works**: Navigate to the **Ask** dashboard. Type a question like "Why is the payment-api failing?" or "Show me the CPU utilization trend for the past 5 hours".
- **Precision Control with Quick Tags**: 
  - Click `/trend` to instruct the AI to generate a time-series graph (matrix query).
  - Click `/average` to generate a scalar average (vector query).
  - Click `/errors` to automatically filter logs and metrics for 500 status codes.

### 3. Actionable Artifacts & Integrations
AiSignal doesn't just show you data; it creates shareable operational artifacts that plug into your existing business workflows.
- **Confluence Export**: Instantly push the generated postmortem to your Atlassian Confluence space via the REST API with a single click, automating your compliance and documentation procedures.
- **Jira Integration**: Easily export structured RCA data directly into Jira tickets for engineering follow-up.
- **Webhook Broadcast**: Generated reports are automatically broadcasted back to your configured Alertmanager receivers (like Slack or Microsoft Teams) so the entire organization stays aligned during an outage.

## Value Proposition
By adopting AiSignal, engineering organizations can:
- **Slash MTTR**: Reduce investigation time from hours to seconds.
- **Democratize Observability**: Empower non-SREs to understand system health without learning query languages.
- **Eliminate Alert Fatigue**: Replace a flood of context-less Slack alerts with a single, comprehensive incident report.
