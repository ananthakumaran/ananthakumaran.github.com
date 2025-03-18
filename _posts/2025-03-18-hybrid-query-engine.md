---
layout: post
title: 'Hybrid Query Engine: ClickHouse + PostgreSQL'
container: hybrid-query-engine
tags: clickhouse postgresql postgres
date: 2025-03-18 08:30 +0530
---
I recently built a hybrid query engine at work. In this post, I
discuss what we did, why we did it, and how we accomplished it. To
keep things simple, I present a simplified version of the problem,
making it easier to explain while focusing on the key aspects. The
real-world scenario is more complex, but the fundamental issue
remained the same.

Our database model can be simply described as:

<p align="center">
  <img src="/public/images/hybrid-query-engine-db-schema.svg" />
</p>


Think of a typical analytics product. The `User` represents a user of
the product, while the `Event` represents an activity performed by the
user. This could be a page view, a button click, or any other
interaction.

Our system allows site admins to configure rules. A rule can be
something like:

1. The user has viewed the page in the last 7 days (`events`).
2. The user has clicked the button at least twice in the last 180 days (`events`).
3. The user is on a paid plan (`users`).
4. The user signed up in the last year (`users`).

The system repeatedly evaluates rules and triggers actions if a rule
evaluates to `true`. The complexity arises from the `Event`
perspective because any new event can change the outcome of the rule
evaluation. As a result, caching rule evaluations becomes quite
challenging.

Our system is built in a straightforward way. We store both `Users`
and `Events` data in PostgreSQL, and each rule is converted into an
SQL query.

Let's have a look at a sample rule and its corresponding query.

### Rule:
- The user has clicked the upgrade button at least twice in the last 180 days.
- The user is on a pro plan.
- The user signed up in the last year.

```sql
SELECT 1
FROM users u
WHERE u.id = {user_id}
      AND u.attributes->>'plan' = {plan}
      AND u.created_at >= now() - interval '1 year'
      AND (
          SELECT COUNT(*)
          FROM events e
          WHERE e.user_id = u.id
                AND e.name = 'click'
                AND e.attributes->>'button_id' = {button_id}
                AND e.created_at >= now() - interval '180 days'
      ) >= 2;
```

This works reasonably well, assuming each user has a few thousand
events. However, as we grew, our events table expanded to multiple
terabytes. While it still works well from a single-user perspective,
aggregate queries such as counting how many people clicked button X in
the last 7 days became too slow.

We needed another database to handle aggregate queries in near
real-time, so we decided to add ClickHouse and duplicated the events
data to ClickHouse.

Is there a way to leverage event data in ClickHouse and remove it from
PostgreSQL?

The biggest challenge we face is ensuring data consistency. We rely on
**read-after-write** consistency so that actions can be triggered
immediately after a user performs any activity. Anything more than
100ms latency would be noticeable. However, achieving read-after-write
consistency at scale with ClickHouse proves to be extremely
difficult. We explored various workarounds provided by ClickHouse but
ultimately concluded that maintaining read-after-write consistency at
scale was not feasible.


One of our biggest problems is the multiple terabytes of data sitting
on PostgreSQL. ClickHouse, on the other hand, provides about 15 to 20
times the compression ratio compared to PostgreSQL storage.

What if we use a hybrid approach, where we depend on PostgreSQL for
the last couple of days and ClickHouse for the rest of the data? This
way, we get better compression for historical event data from
ClickHouse while retaining read-after-write consistency using
PostgreSQL.

Now that I have explained the problem, let me get into the solution
that works for us.

### Logical Plan

The first step is converting the rule into a logical plan.

In the previous version, the rule was directly converted into SQL in
one go. However, since we need to handle two database systems, I
figured it is best to introduce an **intermediate form** that closely
models an SQL query.

This approach allows us to handle domain-specific logic during the
rule → logical plan conversion and address SQL-specific nuances when
converting the logical plan → SQL.


### Executors

An executor takes a logical plan and returns the evaluated result. The
details, such as how it converts the logical plan to SQL or whether it
queries a single system or multiple systems, are handled by the
executor.

#### PostgreSQL Executor

This is almost a complete rewrite of the previous version. Instead of
taking a rule as input, it takes a logical plan. The executor converts
the logical plan to SQL, executes the query on PostgreSQL, and returns
the result.

#### ClickHouse Executor

This works similarly to the PostgreSQL executor, with modifications to
the generated SQL to accommodate differences in syntax.

#### Hybrid Executor

The hybrid executor is where things get interesting. The goal is to
use ClickHouse for historical data and PostgreSQL for real-time
data. This approach operates purely at the logical plan level, relying
on the other two executors to perform the actual execution.

The logical plan is structured as a tree, where each node represents
either a condition or a clause (e.g., `AND` / `OR`). Since the logical
plan follows a recursive tree structure, individual conditions can be
executed independently.


##### Approach

1. Traverse the logical plan tree and collect all event conditions.
2. Split each event condition into two parts:
   - Recent (last 1 day) → Handled by PostgreSQL.
   - Older (except the last 1 day) → Handled by ClickHouse.
3. Execute the event condition separately using the ClickHouse and PostgreSQL executors.
4. Merge the results back into a constant node (`true`/`false`).
5. Replace the original event condition node with the constant node.
6. Execute the updated logical plan using the PostgreSQL executor.

Introducing a logical plan is crucial for the hybrid executor. Without
it, we would have to work at either the rule level or the SQL level.

The rule level contains too many unnecessary domain details, making it
difficult to manage. On the other hand, SQL is typically just a
string, and modifying it directly would be cumbersome and
error-prone. The logical plan provides a structured and flexible way
to handle query transformations efficiently.

Let's dive deep into how **Split** and **Merge** work.

##### Split

```sql
SELECT COUNT(*)
FROM events e
WHERE e.user_id = u.id
      AND e.name = 'click'
      AND e.attributes->>'button_id' = {button_id}
      AND e.created_at >= now() - interval '180 days'
```

The query above represents a typical event condition. To split it, we
introduce a time-based condition.

- PostgreSQL:
  ```sql
  AND e.created_at >= {split_instant}
  ```
- ClickHouse:
  ```sql
  AND e.created_at < {split_instant}
  ```

Choosing the right `split_instant` is important. If we set it as:

```sql
now() - interval '24 hours'
```
this would constantly change, making caching ineffective.

Instead, using:

```sql
toStartOfDay(now() - interval '24 hours')
```
ensures that `split_instant` changes only once every 24 hours, allowing ClickHouse results to be cached efficiently.

##### Merge

The event condition rule can specify conditions like:
- At least `n` times (`>=`)
- At most `n` times (`<=`)
- Exactly `n` times (`==`)

When executing the PostgreSQL and ClickHouse queries sequentially, we
can often skip the second query.

For example, if the rule requires at least 3 occurrences and the
ClickHouse query already returns 5, there is no need to run the
PostgreSQL query—we can return `true` immediately.

This optimization is especially useful when ClickHouse results are
cached, making it cheaper to check the cached result before deciding
whether to execute the PostgreSQL query, which cannot be cached.

##### Caching

Unlike PostgreSQL, ClickHouse is built for analytics
queries. PostgreSQL can handle thousands of queries per second,
whereas ClickHouse can return answers for complex analytics queries in
a fraction of the time. However, it is not designed to run too many
queries simultaneously, making query caching essential.

At first glance, caching might seem straightforward. Since event data
is typically not backdated and we use ClickHouse only for data older
than 24 hours, we might assume that hashing the query and using it as
a cache key would work. However, there is a flaw in this approach.

To cache an SQL query response, both the **data** and the **query**
must be unchanging and deterministic. Since we query ClickHouse only
for data older than 24 hours, we can assume the data remains
unchanged. But what about the query?

Consider the following example:

- The user has clicked the upgrade button at least twice in the last 180 days.

  ```sql
  AND e.created_at >= now() - interval '180 days'
  AND e.created_at < {split_instant}
  ```

The issue lies in `now()`, which is non-deterministic. Even if the
data remains unchanged, the query itself changes with every execution,
potentially returning different results.

So, how do we solve this? Is it even possible?

##### Visualizing the Caching Challenge

Let’s represent time on the x-axis, using `*` to indicate events.

* Basic Scenario without `now()`

  ```text
                                                 | split instant
                                   ClickHouse    |             PostgreSQL
  ----------*---------------------*--------------|--------------*----------------- now
  ```

  In this case:
  - Three events match the query.
  - ClickHouse returns **2** events.
  - PostgreSQL returns **1** event.
  - The merge step combines them to produce the final result.

  Since new events are inserted only on the PostgreSQL side,
  ClickHouse results remain stable and can be safely cached.

* Query Using `now()`, at t and t + few hours

  ```text
           |                                      | split time
           | now() - 7 days        ClickHouse     |            PostgreSQL
  ---------|--*---------------------*-------------|-------------*----------------- now (t)
  ```
  ```text
                |                                 | split time
                | now() - 7 days   ClickHouse     |            PostgreSQL
  ------------*-|-------------------*-------------|-------------*---------------------- now (t + few hours)
  ```

  In this case:
  - At `t` ClickHouse returns **2** events, at `t + few hours`  ClickHouse returns **1** event.
  - PostgreSQL returns **1** event.

  Even though the data in ClickHouse remains unchanged, the boundary
  for ClickHouse shifts over time. Consequently, caching the response
  would be **incorrect**, as each execution could yield different
  results.

##### Making `now()` Queries Cacheable

If we are okay with caching results for **1 hour**, we just need to
ensure there are no matching events in the 1-hour gap before caching
the response.

```text
         |                                      | split time
         | now() - 7 days        ClickHouse     |            PostgreSQL
---------|--*---------------------*-------------|-------------*----------------- now
          | now() - 7 days + 1 hour             |
----------|--*---------------------*------------|
```

- We run two queries:
  1. One for `now() - 7 days`.
  2. Another for `now() - 7 days + 1 hour`.
- If both queries return the same result, we can be sure the query
  result won't change for the next hour, making it safe to cache.

In practice, this approach is nearly as effective as a **full cache**,
since the number of queries that remain uncacheable at any given
moment is small and will likely become cacheable within an hour.

Running two queries might seem inefficient, but ClickHouse provides a
clever way to optimize this:

```sql
SELECT
    countIf(e.created_at >= now() - interval '180 days'),
    countIf(e.created_at >= now() - interval '180 days' + interval '1 hour')
FROM events e
WHERE e.user_id = u.id
      AND e.name = 'click'
      AND e.attributes->>'button_id' = {button_id}
      AND e.created_at < {split_instant}
```

ClickHouse allows `countIf`, which means we can count both conditions
within a single query. This eliminates the need for separate queries
and ensures efficient execution.

There are many nuances to this approach, and I'll leave it as an
exercise to figure out how to handle the `<=` case.

<link rel="stylesheet" href="/public/css/hybrid-query-engine.css"/>
