---
container: hca-layout
layout: post
title: High contention allocator
---

[FoundationDB](https://www.foundationdb.org/) is a distributed
key-value store. The whole database can be considered as a giant
sorted map where key and value are bytes. FoundationDB client library
provides two means for handling namespaces.

**Subspace** - Raw bytes like `users` or `users:profile` is prefixed to keys before
they get stored and stripped from the keys when they are
retrieved. The primary disadvantage is the size of prefix, which
increases as the level of nesting increases.

**Directory** - The size problem is solved by converting namespace to a short unique
prefix. There is an extra cost involved when a directory is created or
opened compared to the subspace, but this will get amortized over time
if the number of directories used is small enough compared to other
requests.

This blog post attempts to explain the algorithm used to create short
unique prefixes in the FoundationDB client libraries. To understand
the issues involved, a naive implementation is presented first and
then its performance characteristics are contrasted with the algorithm
used in the client libraries.


```elixir
defmodule NaiveHCA do
  alias FDB.{Database, Transaction}

  def allocate(transaction) do
    <<counter::integer-64>> = Transaction.get(t, "counter") || <<0::integer-64>>
    counter = counter + 1
    :ok = Transaction.set(t, "counter", <<counter::integer-64>>)
    encoded = :binary.encode_unsigned(counter)
    <<byte_size(encoded)>> <> encoded
  end
end
```

A single 64 bit counter is used to store the state and numbers are
encoded with minimum required bytes -- without leading zeros. To avoid
prefix clash between numbers of different byte sizes like `0x05` and
`0x0501`, the byte size is also added as a prefix.

<svg id="naive-ops"></svg>
<svg id="naive-average"></svg>

Why does the allocations per second seem to max out at about
300?. FoundationDB uses multiversion concurrency control (MVCC) for
reads and optimistic concurrency for writes. As a result, neither
reads nor writes are blocked by other readers or writers. Instead,
conflicting transactions will fail at commit time and should be
retried by the client. The common idiom is to use `Database.transact`
which will retry until the commit succeeds.

```elixir
FDB.Database.transact(database, fn t ->
  NaiveHCA.allocate(t)
end)
```
<svg id="naive-conflicts"></svg>

In the naive implementation, the number of conflicts increases as the
concurrency increases. The major focus of the algorithm is to reduce
the number of conflicts.

Instead of using a single counter a window is used. Each
process tries to acquire a random value within the current
window. Once the current window is half filled, the window is
advanced. The number of conflicting transactions will be small if the
window size is big enough compared to the number of concurrent
process.


<button id="hca-allocate-reset" class="reset">↻ Reset</button>
<svg id="hca-allocate"></svg>


{% raw %}
```elixir
defmodule HCA do
  alias FDB.Coder.{Tuple, Integer, Subspace}
  alias FDB.Transaction
  alias FDB.KeySelectorRange
  alias FDB.KeyRange
  alias FDB.Option

  @counter 0
  @reserve 1

  def allocate(t) do
    hca_coder =
      Transaction.Coder.new(
        Subspace.new("hca", Tuple.new({Integer.new(), Integer.new()})),
        LittleEndianInteger.new(64)
      )

    t = Transaction.set_coder(t, hca_coder)
    prefix = search(t)
    encoded = :binary.encode_unsigned(prefix)
    <<byte_size(encoded)>> <> encoded
  end
```

How the keys and values should be serialized is defined using the `hca_coder`. The
actual work is delegated to the `search` function.

```elixir
  defp search(t) do
    candidate_range = range(t, current_start(t), false)
    search_candidate(t, candidate_range)
  end
```

The search function calculates the current window and calls
`search_candidate` to find a candidate within the window.

```elixir
  defp current_start(t) do
    result =
      Transaction.get_range(t, KeySelectorRange.starts_with({@counter}), %{
        limit: 1,
        reverse: true,
        snapshot: true
      })
      |> Enum.to_list()

    case result do
      [] -> 0
      [{{@counter, start}, _}] -> start
    end
  end
```

The current window's start and the number of values so far allocated
within that window are stored in the following format.

`{@counter, start} => allocated_count`

This function returns the latest window start value

```elixir
  defp range(t, start, window_advanced) do
    if window_advanced do
      clear_previous_window(t, start)
    end

    Transaction.atomic_op(t, {@counter, start}, Option.mutation_type_add(), 1)
    count = Transaction.get(t, {@counter, start}, %{snapshot: true}) || 0
    window = window_size(start)

    if count * 2 < window do
      start..(start + window - 1)
    else
      range(t, start + window, true)
    end
  end

  defp window_size(start) do
    cond do
      start < 255 -> 64
      start < 65535 -> 1024
      true -> 8192
    end
  end
```

`range` is responsible for calculating the current window range. The
allocated count is incremented before hand and the window is advanced
if half filled.

### Conflict range

By default any read or write inside a transaction creates a read or
write [conflict
range](https://apple.github.io/foundationdb/developer-guide.html#conflict-ranges)
for the corresponding key range. When the transaction is committed
these conflict ranges are used to make sure transactions are
serializable.

If every process reads and mutates the same key, then we are back to
the same problem as the naive implementation. FoundationDB provides
means to disable the generation of conflicts, but the responsibility
is on the user to make sure it doesn't compromise the
consistency. Here [snapshot
reads](https://apple.github.io/foundationdb/developer-guide.html#snapshot-reads)
and [atomic
updates](https://apple.github.io/foundationdb/developer-guide.html#atomic-operations)
are used avoid the creation of unnecessary conflict ranges. More on
conflicts will be explained later.

```elixir
  defp search_candidate(t, search_range) do
    candidate = Enum.random(search_range)
    candidate_value = Transaction.get(t, {@reserve, candidate})
    Transaction.set_option(t, Option.transaction_option_next_write_no_write_conflict_range())
    Transaction.set(t, {@reserve, candidate}, 1)

    if is_nil(candidate_value) do
      Transaction.add_conflict_key(
        t,
        {@reserve, candidate},
        Option.conflict_range_type_write()
      )

      candidate
    else
      search_candidate(t, search_range)
    end
  end
```

`search_candidate` repeatedly tries to reserve a random value within
the given window. The write conflict is only added if the value is
not already reserved by some other process.


```elixir
  defp clear_previous_window(t, start) do
    Transaction.clear_range(
      t,
      KeyRange.range({@counter}, {@counter, start}, %{begin_key_prefix: :first})
    )

    Transaction.set_option(t, Option.transaction_option_next_write_no_write_conflict_range())

    Transaction.clear_range(
      t,
      KeyRange.range({@reserve}, {@reserve, start}, %{begin_key_prefix: :first})
    )
  end
end
```

{% endraw %}

There are two main aspects for any algorithm: correctness and performance

### Correctness

Instead of proving the correctness in a rigorous way, I am going to
reason in a semi formal way.

At any point in time, the algorithm would be in two state

1. There are enough unfilled values within in the current window. All
   the process would be able to allocate without advancing the
   window. As the conflict range is set on the reserved candidate,
   only one of the processes would succeed.

1. There are not enough unfilled values within in the current
   window. One or more processes might try to advance the current
   window.

Let's think of a scenario which might break the correctness

| Process 1             | Process 2             | Process 3             |
|-----------------------|-----------------------|-----------------------|
| init                  | init                  |                       |
| allocate x (window 1) |                       |                       |
| commit                |                       |                       |
|                       |                       | init                  |
|                       |                       | clear window 1        |
|                       |                       | allocate y (window 2) |
|                       |                       | commit                |
|                       | allocate x (window 1) |                       |
|                       | commit                |                       |


Process 1 and 2 both starts at the same time, and x is allocated to
process 1. Process 3 finds the window half filled and advances the
window by clearing the current one. Process 2 tries to allocate the
same value x as Process 1.

Let's look at the exact call sequence before trying to reason why it would
not work. FoundationDB client has options to trace transactions. An
edited version of the xml trace file is shown below.

<div class='trace' />

```ruby
{OP: 'GetVersion', ID: 'process 1'}
{OP: 'GetVersion', ID: 'process 2'}
{OP: 'GetRange', ID: 'process 1', RangeSizeBytes: '0', StartKey: 'hcax14x00', EndKey: 'hcax14xffx00'}
{OP: 'GetRange', ID: 'process 2', RangeSizeBytes: '0', StartKey: 'hcax14x00', EndKey: 'hcax14xffx00'}
{OP: 'Get', ID: 'process 1', ValueSizeBytes: '0', Key: 'hcax15x01x14'}
{OP: 'Commit_ReadConflictRange', ID: 'process 1', Begin: 'hcax15x01x14', End: 'hcax15x01x14x00'}
{OP: 'Commit_WriteConflictRange', ID: 'process 1', Begin: 'hcax14x14', End: 'hcax14x14x00'}
>>>>>>{OP: 'Commit_WriteConflictRange', ID: 'process 1', Begin: 'hcax15x01x14', End: 'hcax15x01x14x00'}
{OP: 'Commit_Mutation', ID: 'process 1', Mutation: 'code: AddValue param1: hcax14x14 param2: x01x00x00x00x00x00x00x00'}
{OP: 'Commit_Mutation', ID: 'process 1', Mutation: 'code: SetValue param1: hcax15x01x14 param2: x01x00x00x00x00x00x00x00'}
{OP: 'Commit', ID: 'process 1', NumMutations: '2'}
{OP: 'GetVersion', ID: 'process 3'}
{OP: 'GetRange', ID: 'process 3', RangeSizeBytes: '13', StartKey: 'hcax14x00', EndKey: 'hcax14xffx00'}
{OP: 'Get', ID: 'process 3', ValueSizeBytes: '0', Key: 'hcax15x01x15@'}
{OP: 'Commit_ReadConflictRange', ID: 'process 3', Begin: 'hcax15x01x15@', End: 'hcax15x01x15@x00'}
{OP: 'Commit_WriteConflictRange', ID: 'process 3', Begin: 'hcax14x14', End: 'hcax14x14x00'}
{OP: 'Commit_WriteConflictRange', ID: 'process 3', Begin: 'hcax14x15@', End: 'hcax14x15@x00'}
{OP: 'Commit_WriteConflictRange', ID: 'process 3', Begin: 'hcax15x01x15@', End: 'hcax15x01x15@x00'}
{OP: 'Commit_Mutation', ID: 'process 3', Mutation: 'code: ClearRange param1: hcax14x00 param2: hcax14x15@'}
{OP: 'Commit_Mutation', ID: 'process 3', Mutation: 'code: ClearRange param1: hcax15x01x00 param2: hcax15x01x15@'}
{OP: 'Commit_Mutation', ID: 'process 3', Mutation: 'code: AddValue param1: hcax14x15@ param2: x01x00x00x00x00x00x00x00'}
{OP: 'Commit_Mutation', ID: 'process 3', Mutation: 'code: SetValue param1: hcax15x01x15@ param2: x01x00x00x00x00x00x00x00'}
{OP: 'Commit', ID: 'process 3', NumMutations: '4'}
{OP: 'Get', ID: 'process 2', ValueSizeBytes: '0', Key: 'hcax15x01x14'}
>>>>>>{OP: 'CommitError_ReadConflictRange', ID: 'process 2', Begin: 'hcax15x01x14', End: 'hcax15x01x14x00'}
{OP: 'CommitError_WriteConflictRange', ID: 'process 2', Begin: 'hcax14x14', End: 'hcax14x14x00'}
{OP: 'CommitError_WriteConflictRange', ID: 'process 2', Begin: 'hcax15x01x14', End: 'hcax15x01x14x00'}
{OP: 'CommitError_Mutation', ID: 'process 2', Mutation: 'code: AddValue param1: hcax14x14 param2: x01x00x00x00x00x00x00x00'}
{OP: 'CommitError_Mutation', ID: 'process 2', Mutation: 'code: SetValue param1: hcax15x01x14 param2: x01x00x00x00x00x00x00x00'}
{OP: 'CommitError', ID: 'process 2', Err: 'Transaction not committed due to conflict with another transaction'}
```

FoundationDB provides serializable isolation, which roughly means there should be a total order across all transactions. A transaction conflicts if it reads a key that has been written between the transaction's read version and commit version. Because Process 1 has started before Process 2 is commited, Process 2's read on `{@reserve, candidate}` key conflicts with Process 1's write on the same key. Once a transaction gets the read version, it can't observe any other concurrent writes by other processes. If Process 2 started after Process 1 has committed, then the read will return non nil even if Process 3 has cleared the key range concurrently. This effectively means advancing window doesn't actually introduce any new state. Just having read and write conflicts on reserved candidate's key is enough to maintain the correctness.

### Performance

<svg id="hca-ops"></svg>
<svg id="hca-average"></svg>
<svg id="hca-conflicts"></svg>

From the graphs it's clear that the hca algorithm scales linearly
without any problem.



<link rel="stylesheet" href="/public/css/hca.css"/>
<script src="/public/js/d3.v4.min.js"></script>
<script src="/public/js/underscore.js"></script>
<script src="/public/js/in-view.js"></script>
<script src="/public/js/hca-data.js"></script>
<script src="/public/js/hca.js"></script>
