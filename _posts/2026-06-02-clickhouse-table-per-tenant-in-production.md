---
layout: post
title: Clickhouse table per tenant in production
tags: clickhouse
date: 2026-06-02 15:27 +0530
---
At work, we made a decision to go with a table per tenant approach and
we have been running that setup for a couple of years now. I thought this
would be the right time to share what we have learned and what works
well.

## Why?

The first question is why do you want to create a table per tenant? In
our case, we allow users to define their own event attributes with
their own types. There are 2 main ways you can handle this: keep all
the attributes as a JSON field, or create a table per tenant.
Clickhouse [json](https://clickhouse.com/docs/sql-reference/data-types/newjson) support has been getting better and better. When
we did the benchmark 2 years ago, creating a table per tenant was way
better from multiple perspectives, like less storage due to better
compression, way less query latency. Back then JSON was mostly stored
as a string, so you had to load and parse the whole blob rather than
just the columns you needed. I will not spend more time on why we made
this decision here. This post is more about what you need to be aware
of and how to handle things if you decide to go down this route.

## Table vs Partition vs Part


```
┌─────────────────────────────────────────┐
│ table                                   │
│   ┌─────────────────────────────────┐   │
│   │ partition1                      │   │
│   │  ┌────────┐ ┌───────┐ ┌───────┐ │   │
│   │  │  part1 │ │ part2 │ │ part3 │ │   │
│   │  └────────┘ └───────┘ └───────┘ │   │
│   └─────────────────────────────────┘   │
│   ┌─────────────────────────────────┐   │
│   │ partition2                      │   │
│   │  ┌────────┐ ┌───────┐ ┌───────┐ │   │
│   │  │  part1 │ │ part2 │ │ part3 │ │   │
│   │  └────────┘ └───────┘ └───────┘ │   │
│   └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```


A clickhouse table is made of multiple partitions and each partition
is made of multiple parts. Clickhouse creates a new part per insert
and there are usually multiple parts per partition and multiple
partitions per table. Most of the complexity comes from having too many
parts. Clickhouse [recommends](https://clickhouse.com/docs/knowledgebase/maximum_number_of_tables_and_databases) no more than 5k tables, 50k
partitions and 100k parts.

The number of tables doesn't really matter, what you need to watch is
the total part count. You can have just 10 tables but still hit the
[too many parts](https://clickhouse.com/docs/tips-and-tricks/too-many-parts) problem if your partitions are not set up
carefully.

## Parts are immutable

In Clickhouse, parts are immutable. Every insert creates a new
part. In the background, Clickhouse merges parts together and 5 to 20
parts per partition is considered normal. If the merge process can't
keep up with the rate of inserts, things will start to go out of
control.

Clickhouse gives you two ways to insert data. The first is batch
insert, where you handle the batching yourself. This is atomic and
durable. The second is [asynchronous insert](https://clickhouse.com/docs/optimize/asynchronous-inserts), where Clickhouse
buffers rows in memory at the partition level and flushes them every n
seconds. There is a risk of data loss if the server crashes and you
don't wait for the [flush](https://clickhouse.com/docs/optimize/asynchronous-inserts#choosing-a-return-mode).

If you go with asynchronous insert, you will likely need to tune the
following settings

```
async_insert_busy_timeout_ms  = "30000"     # 30 seconds
async_insert_max_data_size    = "104857600" # 100 mb
async_insert_max_query_number = "1000"
```

The value you want to set depends on many factors. This affects how
long it takes for new data to show up in a read query and if you wait
for the flush, this also determines how long it takes to get an ack for
an insert. Set up proper monitoring for [async](https://clickhouse.com/blog/monitoring-asynchronous-data-inserts-in-clickhouse) operations.

## Number of parts

Your major goal should be to keep the number of parts under control. The
total number of parts per server is one of the main things you need to monitor
closely, and it's surprisingly easy to let it get out of hand. In most cases,
you should avoid creating partitions per table. Since you already have a lot of
tables, adding partitions on top will multiply the part count and make things
worse much faster.

## Server startup time

Clickhouse loads all tables during startup. If you have a lot of tables,
like 10k+, it can take multiple minutes. At peak, our servers were taking
more than 5 minutes to start. There is a flag called
[async_load_databases](https://clickhouse.com/docs/operations/server-configuration-parameters/settings#async_load_databases) to control whether you want to load tables
asynchronously. At first glance, async load might look like a great
idea, but it usually doesn't work very well. It's likely that you will
be running more than 1 clickhouse server and you would be rolling
restart the servers. If you use `async_load_databases`, the server
will immediately announce to the world that it's up and ready to serve
requests. But if you send any requests and that specific table is not
yet loaded, it will take quite a lot of time to finish. If you have
any reasonable system load, this will usually end up causing a mini incident.

It is best to load the tables synchronously and let the other servers
handle the requests while it's restarting. If you run it on
Kubernetes, it also makes sense to have a generous
[initialDelaySeconds](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/#configure-probes) in your probes, you don't want Kubernetes to kill
the pod while it's trying to load the tables.

## Zookeeper

Clickhouse stores table metadata and [insert deduplication](https://clickhouse.com/docs/guides/developer/deduplicating-inserts-on-retries) hashes in Zookeeper. The number of hashes to retain per table is controlled by [`replicated_deduplication_window`](https://clickhouse.com/docs/operations/settings/merge-tree-settings#replicated_deduplication_window), which defaults to 10k. With thousands of tables, the znode count adds up fast and can put a lot of strain on Zookeeper. Monitor CPU and memory closely, and consider reducing it from the default if you have a lot of tables.

## Table schema drift

If you have a table per tenant, you will likely have a different schema per
table. Unlike traditional databases, schema drift in Clickhouse is a real
concern. In traditional databases, you normally just configure the replica and
can be assured there will be no schema drift between master and replica under
normal operating conditions. If it does drift, it is usually global and things
will get fixed automatically once you fix the lag.

In Clickhouse, schema management is done at the per-server level. You need to
run DDL operations on each server individually. You can use
[ON CLUSTER](https://clickhouse.com/docs/sql-reference/distributed-ddl) to
automate this, but unlike other systems, you are responsible for keeping things
in sync. It's easy to diverge; if your application runs a DDL operation while
a node is restarting, that node will miss the change. Clickhouse exposes
most of the table details via system tables. The query below checks if all
servers have the same number of columns for all tables. This is simplistic, and
depending on what you do, you might need your own scripts to catch drift,
because it will happen eventually.

```sql
SELECT table, name, groupArray(hostname()), count(*)
FROM clusterAllReplicas('layer-01', 'system', 'columns')
GROUP BY table, name
HAVING count(*) < 4
ORDER BY table, name
```

The [replicated](https://clickhouse.com/docs/engines/database-engines/replicated) database engine was supposed to fix this by automatically
replicating DDL across nodes, but when we set things up it was not stable and
was missing a lot of features compared to [atomic](https://clickhouse.com/docs/engines/database-engines/atomic). If I were to start
today, I would evaluate it again to see if it has matured enough to avoid the
schema drift problem altogether.

## Read/write split

Clickhouse doesn't have good workload segregation. When a query runs,
it uses all available cores to complete as fast as possible. There are
options like [`max_threads`](https://clickhouse.com/docs/operations/settings/settings#max_threads) to limit this, but they don't help much in
practice. Ideally, you want to prioritize inserts so they don't time
out, while using the remaining capacity for reads. This is not really
possible on a single server.

Your best bet is dedicated read and write nodes. If you use async
insert, write workload tends to be high RPS and latency-sensitive,
so keeping it separate avoids blocking readers. If the
cost of separate nodes is too high, async insert won't work for you
and you'll need to batch inserts yourself via a work queue, accepting
less predictable response times.

## Tenant based routing

Even with dedicated write nodes, you need to be careful about where
you route inserts.

Say you have 20k tables and 2 write nodes. If you
send inserts to any random node, each server has to buffer writes for
all 20k tables. If you hash the tenant id and always send the same
tenant to the same node, each server only buffers writes for 10k
tables, which scales much better.

```
┌──────────────────────────────────────────────────────────────────┐
│                         Envoy Proxy                              │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              │                                     │
        low-latency                            all other
    x-tenant-id (hash)                     x-tenant-id (hash)
              │                                     │
              ▼                                     ▼
  ┌───────────────────────────┐      ┌──────────────────────────┐
  │     clickhouse_write      │      │    clickhouse_read       │
  │   ┌──────────────────┐    │      │   ┌──────┐   ┌──────┐    │
  │   │   priority 0     │    │      │   │ n-02 │   │ n-03 │    │
  │   │  ┌────┐  ┌────┐  │    │      │   └──────┘   └──────┘    │
  │   │  │n-00│  │n-01│  │    │      └──────────────────────────┘
  │   │  └────┘  └────┘  │    │
  │   └──────────────────┘    │
  │   ┌──────────────────┐    │
  │   │   priority 1     │    │
  │   │  ┌────┐  ┌────┐  │    │
  │   │  │n-02│  │n-03│  │    │
  │   │  └────┘  └────┘  │    │
  │   └──────────────────┘    │
  └───────────────────────────┘
```

We ended up using Envoy proxy in front of our 4 nodes. Reads and
writes are routed to 2 separate node groups, with each tenant
consistently hashed to the same node using [`hash_policy`](https://www.envoyproxy.io/docs/envoy/latest/api-v3/type/v3/hash_policy.proto) on the
tenant id header. If all write nodes go down, traffic can spill over to the read group
using Envoy's [priority levels](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/priority), but not the other way around. We also use
[retry on different priority](https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/retry/priority/previous_priorities/v3/previous_priorities_config.proto) for write retries.

<link rel="stylesheet" href="/public/css/clickhouse-table-per-tenant-in-production.css"/>
