---
layout: post
title: PostgreSQL Upgrade using GCP DMS
date: 2025-06-11 08:55 +0530
tags: postgresql postgres gcp dms
---
At work, we recently upgraded our multi-terabyte PostgreSQL database
from version 13 to 16 in Google Cloud Platform (GCP). This post shares
lessons learned during the process, focusing on our experience using
Google's Database Migration Service
([DMS](https://cloud.google.com/database-migration/docs)).

DMS supports various migration types, but here I'll specifically cover
CloudSQL PostgreSQL to CloudSQL PostgreSQL. Notably, we successfully
jumped directly from version 13 to 16, skipping versions 14 and 15,
without encountering major issues.

## DMS Setup

### Source Database Configuration

DMS represents the source database using a connection profile. We
provisioned our connection profile using
[Terraform](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/database_migration_service_connection_profile),
which streamlined the setup of certificate-based authentication.

Under the hood, DMS utilizes
[pglogical](https://github.com/2ndQuadrant/pglogical). Therefore, both
your source and destination databases must have pglogical installed
and configured. Google provides [detailed
documentation](https://cloud.google.com/database-migration/docs/postgres/configure-source-database)
on the necessary steps for both source and destination databases. Pay
close attention to updating the required Cloud SQL flags on the source
database, as this may necessitate a database restart.

### Destination Database Configuration

For the destination database, DMS offers the flexibility to either
provision a new PostgreSQL instance or utilize an existing one. We
opted for an existing instance to maintain full control over its
configuration via Terraform.

### Limitations

*   **DDL Restrictions:** Avoid making any Data Definition Language (DDL) changes (like `CREATE TABLE`, `ALTER TABLE`, `DROP INDEX`, etc.) on the source database during the migration. DMS will not replicate these changes to the destination.

*   **Sequence Migration:** Sequences are automatically
    migrated. However, the `last_value` on the new system might be
    slightly higher than the exact last value from the source. This is
    generally acceptable, provided your application doesn't rely on
    strictly continuous sequence values (which is a not good practice anyway, as transactions rolling back can cause gaps in sequences even during normal operations).

For a comprehensive list of limitations, refer to the [official DMS documentation](https://cloud.google.com/database-migration/docs/postgres/known-limitations).

## Migration Phases

The DMS service handles the migration process in distinct phases:

### Full Dump

The initial phase involves taking a full dump of the source
database. A critical, and not widely documented, aspect is that DMS
briefly acquires exclusive locks on tables at the start of this
phase. In our experience, this lasted 1 to 2 minutes in total and
could potentially disrupt your application's workload. We learned this
behavior the hard way on production, as the smaller data size in
staging did not reveal this effect.

The full dump is performed using PostgreSQL's `\COPY` command. If your
destination database is version 14 or later, you can monitor the
progress of large tables using the `pg_stat_progress_copy` view. You
can also query `pg_stat_activity` to see which tables are currently
being copied and the level of concurrency.

During this phase, DMS primarily copies the raw table data. Indexes
and constraints are created only after the data copy is completed for
all tables.

### Change Data Capture (CDC)

After the full dump is complete and indexes are built, the migration
transitions to the CDC phase. In this phase, DMS applies changes that
occurred on the source database during the full dump. You should
monitor the replication lag and wait for it to reach zero. The time
this takes depends on the duration of the full dump and the volume of
changes on the source during that period.

## Estimating Migration Time

One of the main challenges we encountered was accurately estimating
the time required for the full dump phase to complete and transition
to CDC. We configured DMS with the maximal parallelism option, which
allowed us to achieve a throughput of 150 to 250 MiB/s. Throughput was
notably lower for tables containing a significant number of dead
tuples, as we were unable to perform a `VACUUM FULL` on the source
database beforehand (as it would acquire exclusive locks and block application writes).

### Optimizing Copy Performance

If you are dealing with multi-terabyte databases, like we were, there
are several configurations you can adjust to potentially increase the
copy performance. We recommend consulting the PostgreSQL documentation
on [populating a new
database](https://www.postgresql.org/docs/current/populate.html) and
Google's specific [DMS best practices
article](https://cloud.google.com/blog/products/databases/best-practices-for-migrating-postgresql-to-cloud-sql-with-dms)
for detailed guidance.

## Pre-Promotion

A crucial step that DMS does **not** perform automatically is running
`ANALYZE` on your tables. We learned this the hard way. It is
essential to run `ANALYZE` on all tables after the migration completes
to ensure the query planner has up-to-date statistics. Consider using
a script to run `ANALYZE` in parallel across your tables. If time
permits, `VACUUM ANALYZE` is even better. Crucially, do not promote
the destination instance before confirming that all tables have been
analyzed

You can use the following SQL query to identify tables that haven't been analyzed:

```sql
SELECT distinct(relname) FROM pg_stat_all_tables
WHERE last_analyze is null
      AND relname not like 'pg_%';
```

## Promotion

Once your migration has entered the CDC phase and the replication lag
has reached zero, you are ready to promote the destination instance to
become the new primary.

To minimize downtime:
1.  Stop all write traffic to the old database instance.
2.  Monitor the replication lag to ensure it remains at zero. While
    the DMS dashboard shows the lag, it might have a delay of around
    30 seconds. For more immediate monitoring on the old instance, you
    can use this SQL query:

    ```sql
    SELECT slot_name,
           confirmed_flush_lsn,
           pg_current_wal_lsn(),
           (pg_current_wal_lsn() - confirmed_flush_lsn) AS lag
    FROM pg_replication_slots;
    ```
3.  Initiate the promotion process in DMS. Based on our observations,
    the promotion itself typically takes about 5 minutes.

If you have a large number of tables (e.g., thousands), you might
encounter an error message during promotion similar to this:

```txt
When promoting target Cloud SQL instance, source instance is not reachable and settings needed for replication can't be cleaned up
```

This error is generally safe to ignore if you plan to decommission the
old instance. It indicates that DMS timed out while attempting to
clean up the pglogical setup on the source instance, likely due to
the volume of tables. The promotion of the new instance will still
complete successfully.

However, if you need to roll back or intend to continue using the old
instance for any reason, you *must* manually clean up the pglogical
setup on the source. Refer to the [Google Cloud
documentation](https://cloud.google.com/database-migration/docs/postgres/diagnose-issues#clean-up-relication-slots)
for instructions on cleaning up replication slots. You can also
consult the [pglogical](https://github.com/2ndQuadrant/pglogical)
documentation for available commands.

## Backup and Recovery

During the migration process, DMS disables the point-in-time recovery
(PITR) feature on the destination instance. This is a necessary step
for the migration to function correctly. After you have successfully
promoted the destination instance to be the new primary, you must
remember to re-enable PITR. Be aware that enabling PITR will require a
database restart, causing a minor disruption to your application's
workload.


## Summary of Potential Downtime

Based on our experience, here are the key phases where you might
encounter downtime or disruption during the migration process:

1.  **Source Database Restart for Logical Decoding:** Enabling the
    `cloudsql.logical_decoding` flag on the source instance requires a
    database restart, typically causing about 1 minute of downtime.
2.  **DMS Exclusive Lock:** At the very beginning of the full dump
    phase, DMS briefly acquires an exclusive lock on tables in source
    database. This lasted 1 to 2 minutes in our case and can disrupt
    application workload.
3.  **Destination Database Promotion:** Promoting the destination
    instance to become the new primary takes approximately 5 minutes.
4.  **Re-enabling PITR:** After promotion, re-enabling Point-in-Time
    Recovery (PITR) on the new primary requires a database restart,
    usually resulting in about 1 minute of downtime.
