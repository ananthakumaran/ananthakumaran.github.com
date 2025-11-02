---
layout: post
title: Moving tables across PostgreSQL instances
tags: postgresql postgres gcp pgbouncer
date: 2025-11-02 11:09 +0530
---
At work, we recently had to move a few tables from one PostgreSQL
instance to another. In my previous
[post](https://ananthakumaran.in/2025/06/11/postgresql-upgrade.html),
I discussed how to use Google's Database Migration Service
([DMS](https://cloud.google.com/database-migration/docs)) to migrate
data from one instance to another. Unfortunately, that option was not
available here, since DMS only allows the migration of an entire
database, not specific tables within a database.

We chose the native logical replication option. It’s a much more
involved process compared to using DMS, but it provides greater
flexibility and allows replication of specific tables only.


### Grant access to user accounts

Let's assume you already have both the source and destination PostgreSQL
instances ready. You need to grant replication access to the user
accounts on both the source and destination databases. In the case of
Cloud SQL, we had to grant the `REPLICATION` role to the user account;
this may vary for other instances.


```sql
ALTER USER "sql" with REPLICATION

-- run \du to verify
```

### Copy over schema

The next step is to copy over the schema. The table schema needs to be
identical on both the source and destination. We used `pg_dump` to dump
and restore the schema, as we had to move more than 50 tables.

There are a few nuances related to constraints as well, which we will
cover soon. Before that, let's try to understand a bit more about how
logical replication works.

Logical replication runs in two modes:

1) **Initial dump:** It copies the data from the source to the destination.

2) **CDC:** Once the initial dump is done, it switches to CDC mode
and applies changes to the destination in real time.

The key point here is that during the initial dump, some constraints
can’t be enforced. For example, if you have a foreign key relationship
between two tables, dumping one of the tables will throw an error if
the referenced column hasn’t been dumped yet.

To solve this problem and to speed up the initial dump process, we
first create tables without constraints and indexes. Indexes slow down
the dump stage, and it’s easier to rebuild them once the initial dump
is complete.

`pg_dump` provides a useful flag to dump only the table definitions
without indexes and constraints.

```sh
pg_dump URL --no-owner --no-acl --section=pre-data -s \
   -t users \
   -t events \
   > /tmp/pre-data.sql
```

The `--section` flag allows us to control what is dumped. `pre-data`
dumps only the table definitions, while `post-data` dumps all
constraints and indexes.

```sh
pg_dump URL --no-owner --no-acl --section=post-data -s \
   -t users \
   -t events \
   > /tmp/post-data.sql
```

#### Restore table definition

```sh
psql URL --echo-all --single-transaction -v ON_ERROR_STOP=1 -f /tmp/pre-data.sql
```

There’s one more catch here: logical replication depends on the
primary key, so you need to create the primary key constraint
in addition to the table definition. However, primary key constraints are
in the `post-data.sql` file. Open it in an editor and remove everything
except the primary key constraints.


#### Restore primary key constrain

```sh
psql URL --echo-all --single-transaction -v ON_ERROR_STOP=1 -f /tmp/primary-key-only.sql
```

#### Functions and others

If you use PostgreSQL functions, enums, or anything that isn’t
covered by `pg_dump`, you might have to handle those manually. When you
specify the `-t table` option, it only copies objects directly related
to the tables. Enums and functions don’t fall under that.

### Set up publication and subscription

At this point, the table structure should be identical on both
instances for the tables that are going to be migrated. The publication
should be created on the source instance.

```sql
CREATE PUBLICATION migration_publication FOR TABLE users, events
```

A corresponding subscription needs to be created on the destination
instance.

```sql
CREATE SUBSCRIPTION migration_subscription
         CONNECTION 'host={IP} port=5432 user={USER} password={SECRET} dbname={DBNAME} sslmode=require'
        PUBLICATION migration_publication
```

Replace `{variable}` with the respective values. If the verify CA
option is enabled on the source instance, you need to disable it and
enable only SSL mode.

Once the subscription is created, PostgreSQL starts copying data
from the source to the destination instance. It performs an initial data
dump for each table and then switches to CDC mode.

You need to wait until the initial dump is complete and it moves to the
CDC state with near-zero lag. PostgreSQL exposes this information through
several tables such as `pg_replication_slots`, `pg_stat_replication`, and
`pg_stat_subscription`.


```sql
SELECT slot_name,
       confirmed_flush_lsn,
       pg_current_wal_lsn(),
       (pg_current_wal_lsn() - confirmed_flush_lsn) AS lsn_distance
FROM pg_replication_slots
```

```sql
SELECT subscription_name, active,
       pg_size_pretty(pg_current_wal_lsn() - replay_lsn) AS lag_bytes
FROM pg_stat_subscription
```

```sql
SELECT relid::regclass AS table_name,
       srel.srsubstate AS replication_state,
       CASE srel.srsubstate
           WHEN 'i' THEN 'Initializing'
           WHEN 'd' THEN 'Initial Dump'
           WHEN 's' THEN 'Synchronized'
           WHEN 'r' THEN 'Replicating'
           ELSE 'Unknown'
       END AS state_description
FROM pg_subscription sub
JOIN pg_subscription_rel srel ON sub.oid = srel.srsubid
ORDER BY table_name
```

### Add indexes and foreign keys

Once the replication moves to the CDC state, you can create indexes and
foreign keys. The `post-data.sql` file contains all indexes and foreign
keys. Remove the primary key constraints and keep the rest.

```sh
psql URL --echo-all --single-transaction -v ON_ERROR_STOP=1 -f /tmp/indexes.sql
```

This will take quite some time if you have a lot of data.

### Analyze

`analyze` is one of the most often overlooked steps when moving or upgrading
PostgreSQL instances. PostgreSQL depends on the statistics generated by this
command to create an efficient query plan. Without these statistics, it might
choose an inefficient plan, and a query that used to take 50 ms could turn
into a 1-second query on your new instance. So make sure to run `analyze`
once the indexes are created. If you have more time, you can also run
a `vacuum` as well.

```sql
-- start with analyze (will be done faster compared to vacuum)
analyze (verbose, BUFFER_USAGE_LIMIT '64MB')
-- vacuum analyze
vacuum (verbose, analyze)
```

### Switchover

#### Sequence

Your data is now available on both systems, and you are nearly
ready to switch your traffic from the source to the destination.

PostgreSQL copies the data and keeps the indexes in sync, but it
doesn’t sync the sequences. You have to do that manually.

```sql
-- view current value
SELECT s.schemaname, s.sequencename, s.last_value
FROM pg_sequences s
WHERE s.sequencename in ('users_id_seq', 'events_id_seq');
```

You can view the current value on the source instance, and then set it
to a higher value on the destination instance.

```sql
SELECT
  'SELECT setval(' ||
  quote_literal(s.schemaname || '.' || s.sequencename) || ', ' ||
  CASE
    WHEN s.sequencename = 'users_id_seq' THEN s.last_value + 100
    ELSE s.last_value + 10000
  END || ', true);'
FROM pg_sequences s
WHERE s.sequencename IN (
  'events_id_seq',
  'users_id_seq'
);
```

You can run the snippet above on the source instance; the output is a
SQL query that you can run on the destination instance. The buffer
value is up to you. The key point is that after running the query on the
destination instance, you need to perform the switchover before the
sequence values on the source instance exceed those on the destination
instance.

#### Disable writes

Once the sequence is updated, stop sending writes to the source
PostgreSQL instance. Wait for the replication lag to reach zero, and
then switch all writes to the destination PostgreSQL instance. You can
monitor the replication lag using `pg_replication_slots`.

#### PgBouncer

The amount of downtime depends on how your app is architected, whether
your application can run in read-only mode, and other factors.
[PgBouncer](https://www.pgbouncer.org/) can help significantly in this
regard, and it’s what we used to achieve near-zero downtime.

PgBouncer is a PostgreSQL proxy. The key feature relevant to our
situation is that it allows configuration changes without requiring a
restart. Assume you have a database named `myapp` that’s configured to
connect to the source instance. You can edit the PgBouncer config file
to update the connection details to point to the destination instance.
Then, connect to the PgBouncer
[admin console](https://www.pgbouncer.org/usage.html#admin-console) and
run the following commands.

```
pgbouncer> PAUSE myapp;
pgbouncer> RELOAD;
pgbouncer> SHOW DATABASES;
pgbouncer> RESUME myapp;
```

The first command pauses all connections from PgBouncer to the source
PostgreSQL instance. The command blocks until all in-flight queries are
completed, and new queries are queued. `RELOAD` reloads the configuration
from disk. You can run `SHOW DATABASES` to quickly verify that the new
configuration has been loaded. `RESUME` then resumes connectivity, now
to the new destination PostgreSQL instance.

If you don’t have any long-running queries, this process can result in
near-zero downtime, as no queries are dropped. As long as `RESUME` is
executed quickly, users will notice at most a slight increase in latency.

You can use the following query to check for long-running queries and
terminate them if needed.


```sql
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '2 minutes';
```

In the worst-case scenario, if the `PAUSE` command hangs because of a
long-running query, you can forcefully restart PgBouncer. However, this
will result in errors for any active connections.


### Cleanup

Once you’re confident everything is working correctly, you can clean up
the logical replication setup.

Drop the subscription on the destination instance.

```sql
DROP SUBSCRIPTION migration_subscription
```

Drop the publication on the source instance.

```sql
DROP PUBLICATION migration_publication
```
