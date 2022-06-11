---
layout: post
title: Sentry Performance Monitoring for Elixir Applications
draft: true
date: 2022-06-11 21:06 +0530
tags: elixir telemetry
---
[Sentry](https://sentry.io/welcome/) added support for performance monitoring (also known as
distributed tracing) some time ago. It comes with excellent library
support for many languages. There is an official Elixir [library](https://github.com/getsentry/sentry-elixir)
for Sentry integration, but it [lacks](https://github.com/getsentry/sentry-elixir/issues/426) the performance monitoring
feature. In this post, I will explain how we capture traces and
integrate them with Sentry.

We have a mix of Ruby, Elixir, and Node.js applications, and a Go
application is thrown in for good measure. So we had to find a
solution that works well with the sentry libraries maintained by
Sentry.

### Distributed Trace

A Trace captures the details of operations across multiple
applications within the context of a single root operation, typically
a user initiated request. Individual operation is represented as Span
in the trace.

<img class="full-width" src="/public/images/sentry/trace.png" />

### OpenTelemetry

[OpenTelemetry](https://opentelemetry.io/) is an initiative that tries to standardize
application observability APIs and tools. It supports traces in
addition to other signals and has good library support for Elixir. The
idea is to use the [opentelemetry-erlang](https://github.com/open-telemetry/opentelemetry-erlang) in Elixir applications
and send all the traces to [OTEL Collector](https://opentelemetry.io/docs/collector/). Collector has
pluggable exporters, [sentry-exporter](https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/sentryexporter#section-readme) is used to forward the
traces to Sentry.

<img src="/public/images/sentry/architecture.svg" />

### Context Propagation

Whenever an application requests another application, it has to
propagate some context like `trace_id`, `span_id`, `sampled?`,
etc. Sentry uses the [sentry-trace](https://develop.sentry.dev/sdk/performance/#header-sentry-trace) header, which is quite similar
to the W3C [trace-parent](https://www.w3.org/TR/trace-context/#traceparent-header) header. Even though opentelemetry-erlang
doesn't support the sentry header format, it was trivial to write a
[custom propagator](https://github.com/scripbox/opentelemetry_sentry) for the sentry.

```elixir
config :opentelemetry,
  text_map_propagators: [OpentelemetrySentry.Propagator],
  span_processor: :batch,
  traces_exporter: :otlp,
  sampler: {:otel_sampler_parent_based,
             %{root: {:otel_sampler_trace_id_ratio_based, 0.1}}},
  resource: [service: %{name: "foo"}]

config :opentelemetry_exporter,
  otlp_protocol: :http_protobuf,
  otlp_endpoint: "http://otel-collector.acme.com:4318"
```

### OTEL Collector Configuration

Once the traces reach the collector, they get exported to the sentry.

```yaml
exporters:
  sentry:
    dsn: https://key@sentry.acme.com/path/42
```

The sentry exporter accepts only one DSN, which is mapped to a single
sentry project. Traces from different applications must not be
exported to a single sentry project, and we prefer not to run a
collector per application. Fortunately, the collector is flexible
enough that we can handle this via the [routing](https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/routingprocessor#section-readme) processor. In the
example below, the traces get routed to the correct sentry project
based on the service name.

```yaml
processors:
  batch: {}
  routing:
    attribute_source: resource
    from_attribute: service.name
    default_exporters:
    - logging
    table:
    - value: foo
      exporters: [sentry/foo]
    - value: bar
      exporters: [sentry/bar]
exporters:
  logging: {}
  sentry/foo:
    dsn: https://key@sentry.acme.com/path/42
  sentry/bar:
    dsn: https://key@sentry.acme.com/path/11
service:
  pipelines:
    traces:
      receivers:
        - otlp
      processors:
        - batch
        - routing
      exporters:
        - logging
        - sentry/foo
        - sentry/bar
```

### Fine tuning

[OpenTelemetry Collector Contrib](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor) comes with a huge list of
processors. For example, the way database span is named is different
in opentelemetry-erlang compared to how it is handled by other sentry
libraries. The query itself is used as a part of the span name. We
were able to easily solve this problem by rewriting the span name
using the [span](https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/spanprocessor#section-readme) processor

```yaml
span/db:
  include:
    match_type: regexp
    span_names: ["\\.repo\\.query"]
  name:
    separator: ":"
    from_attributes: [db.statement]
```


<link rel="stylesheet" href="/public/css/sentry.css"/>
