---
layout: post
title: Moving a tenant across PostgreSQL instances
tags: postgresql postgres
date: 2026-04-22 09:21 +0530
---
In earlier posts, I covered how to move
[full](https://ananthakumaran.in/2025/06/11/postgresql-upgrade.html)
PostgreSQL data between instances using GCP DMS, and how to move
selected
[tables](https://ananthakumaran.in/2025/11/02/moving-tables-across-postgres-instances.html)
across instances. In this post, I’ll focus on moving data for a
specific tenant from one instance to another.

This typically comes up in multi-region setups (US, EU), where a
tenant needs to relocate, for example from US to EU, due to regulatory
requirements. The approach here is fairly generic and applies to a
range of similar scenarios.

### Shards

At some point, a single database stops being enough. You either run
out of disk space, most managed PostgreSQL instances top out around
64TB, or you run out of CPU, typically capped around 128 cores. Once
you get close to those limits, you need to shard your data. In a
typical SaaS setup, a straightforward approach is to keep each
tenant’s data in a single shard and let the application handle
routing.

In this post, I’ll focus on that setup. Given a tenant in Shard A, how
do you move them to Shard B? The move can be done in two ways: online
or offline. Online means the application stays available while the
migration runs. Offline means the application is unavailable for that
tenant during the migration.

I had to solve this recently at work. We chose an offline migration
because it is simpler to implement correctly. Online migration is
significantly more complex. This post focuses on the offline approach.

### To move or to clone

The first decision is whether to move the data or clone it. Each comes
with its own risks

#### Move

Move means copying data from one instance to another and then deleting
it from the source. That deletion is the key distinction. If you do
not delete the source data, it is a clone.

The main risk is failure during the process. If something goes wrong
and the copy is incomplete or inconsistent, you have no rollback
because the source has already been deleted.

#### Clone

Because deleting the source is risky, the alternative is to keep it
and create a copy. You can delete the source later during cleanup,
once you are confident the migration succeeded.

At first glance, this looks like the same thing with a delayed
delete. That is partly true, but there is an important caveat. Most
systems use UUIDs and treat them as globally unique identifiers. They
are used as cache keys, lookup keys, and so on. If you clone data, you
now have the same UUID in two places referring to different
records. With move, this is avoided because the source is
removed. With clone, you need a way to handle this without deleting
the source.

We chose the clone approach because move is too risky without a
fallback. That meant dealing with the UUID issue. The solution turned
out to be simpler than expected. I will get to that, but first, some
basics.

#### Granularity

There is also the question of granularity. You rarely want to clone
the entire tenant. In most setups, you already have a separation
between control plane and data plane, and things like membership,
ACLs, and billing are not part of the migration.

In a setup like the one below, the right unit of migration is usually
at the project level. If designed well, after the migration, the
selected project (project b) remains in a read-only state in the
source shard, and a clone of project b is available in the target
shard. This gives the tenant time to switch over, with a
straightforward fallback if something goes wrong.

```text
Tenant A
|
+-- Control Plane
|   |
|   +-- Team Members
|   +-- ACL
|   +-- Billing
|
+-- Data Plane
    |
    +-- project a
    +-- project b (readonly)
    +-- clone of project b
```


### Read only mode

I mentioned online vs offline migration earlier. Offline means the
application is unavailable for the tenant during the migration. The
reason is simple: the source needs to stay immutable while the copy
runs, so nothing changes underneath it.

The simplest way to achieve this is to introduce a tenant-level
read-only mode. It has to be enforced strictly. Nothing should be able
to modify tenant data, no background jobs, no writes from any API,
nothing.


### Export and Import

```text
+-------------------+      +-------------------+      +-------------------+
|     Shard A       | ---> |  Object storage   | ---> |     Shard B       |
|  (PostgreSQL)     |      |                   |      |  (PostgreSQL)     |
+-------------------+      +-------------------+      +-------------------+
```

Once the tenant is in read-only mode, you can start copying data from
Shard A to Shard B. It is usually better to use object storage as an
intermediate step, since export and import take different amounts of
time. Piping data directly would keep a transaction open longer than
necessary.

```sql
-- export
COPY (
  SELECT id,
         attributes,
         inserted_at,
         updated_at,
         tenant_id
  FROM events
  WHERE tenant_id = 'tenant1'
) TO STDOUT WITH (FORMAT binary);

-- import
COPY events (
  id, attributes, inserted_at, updated_at, tenant_id
) FROM STDIN WITH (FORMAT binary);
```

[COPY](https://www.postgresql.org/docs/current/sql-copy.html) is the
most efficient way to move data between instances. The order of
copying is usually driven by foreign key constraints. You need to load
dependent tables first before copying a table that references them.

### Batching

What if you have a lot of data? Copying everything in one go is
risky. If it fails, you have to start from the beginning.

Fortunately, `COPY` supports filtering, so you can batch based on a
timestamp or another column. Each `COPY` operation is transactional,
so it either succeeds or fails as a unit. With batching, you can retry
only the failed chunk instead of restarting the entire process.

### UUID

Now to the UUID problem. In the earlier example, we copy rows as-is,
which duplicates the `id`. That gives you the same UUID in two places
referring to different records. The impact is hard to reason about, so
it is safer to change the `id`. But you cannot generate a random UUID,
since it may be referenced by other tables.

This is a good fit for `uuid_generate_v5`. It takes a namespace UUID
and a text value, and returns a new UUID. You can use a
migration-specific namespace and the old `id` as input. The result is
deterministic. For any foreign key, apply the same function to keep
references consistent. The function is available via the `uuid-ossp`
extension.

```sql
-- enable extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- export
COPY (
  SELECT uuid_generate_v5(migration_id::uuid, id::text) as id,
         attributes,
         inserted_at,
         updated_at,
         tenant_id
  FROM events
  WHERE tenant_id = 'tenant1'
) TO STDOUT WITH (FORMAT binary);
```

### Sequence

Sequences need special handling. In our case, the sequence was on a
per-tenant table, so we copied the data and then ran `setval` after
the `COPY`.

```sql
select setval('events_id_seq', (select max(id) from events), true);
```

If the sequence is on a shared table, you can omit that column and let
`COPY` use the auto-increment. This only works if there are no foreign
key references. If there are, it gets more complicated.

Regardless of the approach, remember that `COPY` does not update
sequence values unless the column is omitted. If you provide explicit
values, you are responsible for advancing the sequence.


### Take aways

Two things to take away from this post:

1. Look into the `COPY` command. It is likely the fastest way to move
   bulk data between instances. In this setup, most of its usual
   downsides do not apply. You can use the binary format, and the
   source and destination typically run the same PostgreSQL version
   with identical schemas.

2. If you use UUIDs as primary keys, `uuid_generate_v5` gives you a
   deterministic way to remap IDs during migration.

<link rel="stylesheet" href="/public/css/postgres.css"/>
