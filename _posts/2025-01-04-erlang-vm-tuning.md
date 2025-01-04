---
layout: post
title: Fine Tuning the Erlang Virtual Machine
tags: elixir debugging performance
container: erlang-vm-tuning
date: 2025-01-04 11:18 +0530
---
In my previous [post](https://ananthakumaran.in/2024/10/26/ets-vs-redis.html), I discussed how to identify the causes of
high CPU usage. In this post, I’ll focus on addressing system
bottlenecks. Our production workload runs on 16-core machines, yet the
CPU usage has never exceeded **70%**. In other words, the system
effectively uses no more than 11 cores.

I took some time to eliminate the usual suspects to ensure I wasn’t
investigating the wrong issue. In my case, this involved verifying
that neither Google Cloud Platform nor Kubernetes (K8S) was throttling
the CPU.

The CPU utilization was low, suggesting that there weren’t enough
tasks available to keep all cores active. After verifying that system
load was adequate and ruling out application-level issues like
connection pooling, I concluded these factors were not responsible. To
identify the root cause, I needed to gather more detailed system-level
insights.


### lcnt - The Lock Profiler

Erlang offers a tool called **[lcnt](https://www.erlang.org/doc/apps/tools/lcnt_chapter)** to measure VM-level lock
issues. Unfortunately, it is not enabled by default, and Erlang must
be compiled with the `--enable-lock-counter` flag to activate this
feature. I couldn't find any existing Elixir Docker image with this
flag enabled, so I ended up building Erlang separately and copying the
relevant files.

```docker
COPY --from=acme/erlang-lcnt:26.1.2-alpine-3.18.4 \
      /usr/local/lib/erlang/erts-14.1.1/bin/*lcnt* \
     ./backend/erts-14.1.1/bin/
```

The `--enable-lock-counter` flag generated a separate emulator with
lock profiling enabled. To utilize this emulator instead of the
default one, I had to configure the system using the `-emu_type` flag.

```sh
ERL_FLAGS="-emu_type lcnt" iex -S mix phx.server
```

Initially, I was concerned about potential performance degradation,
but it turned out there was no noticeable difference between this
emulator and the default one in our case.

Lock-related information is collected continuously in the background,
much like counters that are incremented over time. The `:lcnt.clear()`
function can be used to reset all these counters to their default
state. This is important because, in most cases, you would want to
capture this information for a specific period rather than from the
start of the VM.


A typical session would look like this:

```elixir
# Reset the existing metrics
:lcnt.clear()

# Run your workload

# Collect metrics - this captures a snapshot of all counters
:lcnt.collect()

# View the counters snapshot in a tabular format
:lcnt.conflicts()
```

`:lcnt.collect()` captures a snapshot of the current metrics, which
can be queried in various ways. Below is a sample result from
`:lcnt.conflicts()`, where the data is grouped by lock class.

<pre class="small" style="color: #657b83; background-color: #fdf6e3;">
<b>iex> :lcnt.conflicts()</b>

                       lock    id    #tries  #collisions  collisions [%]  time [us]  duration [%]
                      -----   ---   ------- ------------ --------------- ---------- -------------
               <span class="bold">db_hash_slot</span>  5696  13510419       113487          0.8400   49404882       <span class="bold">11.7761</span>
             <span class="bold">alcu_allocator</span>    10   3330003        35775          1.0743   23423967        <span class="bold">5.5833</span>
                  run_queue    18 126707580      1178423          0.9300    2939175        0.7006
                  proc_main 10916  40061045       151795          0.3789    2586523        0.6165
                  port_lock  5151  15861626        13096          0.0826     686935        0.1637
                       mseg     1    151821          764          0.5032     382948        0.0913
                   pix_lock  1024     31091           13          0.0418     295868        0.0705
                     db_tab   285  80911441         8026          0.0099     258938        0.0617
                   proc_btm 10916   5601908        10564          0.1886      79911        0.0190
               drv_ev_state   128  12502249         3028          0.0242      76296        0.0182
                proc_status 10916  39289252         7236          0.0184      47459        0.0113
                  proc_msgq 10916  49683469        35247          0.0709      33712        0.0080
            port_sched_lock  5153   9761618         4078          0.0418       9071        0.0022
              process_table     1    177504           73          0.0411       2075        0.0005
 dirty_run_queue_sleep_list     2    448095           24          0.0054         72        0.0000
</pre>


You can choose not to group by class and instead sort by per lock **id**. This provides a clearer view of which specific locks are consuming more time.

<pre class="small" style="color: #657b83; background-color: #fdf6e3;">
<b>iex> :lcnt.conflicts(combine: false, print: [:name, :id, :tries, :ratio, :time, :duration])</b>

           lock                       id  #tries  collisions [%]  time [us]  duration [%]
          -----                      --- ------- --------------- ---------- -------------
 <span class="bold">alcu_allocator</span>              <span class="bold">eheap_alloc</span>  366897          8.8891   23322582        <span class="bold">5.5591</span>
   db_hash_slot  prometheus_metrics_dist 1897002          3.7327   17451758        4.1598
   db_hash_slot  prometheus_metrics_dist  898806          1.4163    6976784        1.6630
   db_hash_slot  prometheus_metrics_dist 1589817          0.5860    6691033        1.5949
   db_hash_slot  prometheus_metrics_dist  864521          0.2190    6078246        1.4488
   db_hash_slot  prometheus_metrics_dist 1000479          0.3126    5075027        1.2097
   db_hash_slot  prometheus_metrics_dist 1083966          0.3056    4273343        1.0186
      proc_main  <user@127.0.0.1.4901.0> 2832033          2.3855    1229493        0.2931
   db_hash_slot         shards_partition    3947          0.7601     908902        0.2166
           mseg                        0  151821          0.5032     382948        0.0913
   db_hash_slot         shards_partition    1588          0.3778     236682        0.0564
      run_queue                        8 8737378          0.9529     211859        0.0505
      run_queue                        1 8963035          0.9492     207612        0.0495
      run_queue                        7 8751836          0.9598     204747        0.0488
      run_queue                        3 8652748          0.9513     202607        0.0483
      run_queue                       11 7993632          0.9512     198954        0.0474
      run_queue                        9 8624551          0.9514     194698        0.0464
      proc_main          user_drv_writer  461096          0.1091     192408        0.0459
      run_queue                       10 8350881          0.9302     188309        0.0449
      run_queue                       14 6502914          0.8891     186478        0.0444
</pre>

`:lcnt.information()` displays aggregate-level information at the VM
level. Below is a sample response from a different machine.

<pre class="small" style="color: #657b83; background-color: #fdf6e3;">
<b>iex> :lcnt.information()</b>

information:
              #locks : 20959
            duration : 45751741 us (45.7517 s)

summated stats:
              #tries : 8848260
              #colls : 7961
           wait time : <span class="bold">7111 us</span> ( 0.0071 s)
 percent of duration : 0.0155 %
:ok
</pre>


I started with `alcu_allocator` because it was one of the two locks
with the most contention. The `:lcnt.inspect/1` function could be used
to inspect a specific lock class.

<pre class="small" style="color: #657b83; background-color: #fdf6e3;">
<b>iex> :lcnt.inspect(:alcu_allocator)</b>

           lock            id  #tries  #collisions  collisions [%]  time [us]  duration [%] histogram [log2(us)]
          -----           --- ------- ------------ --------------- ---------- ------------- ---------------------
 alcu_allocator   <span class="bold">eheap_alloc</span>  366897        32614          8.8891   23322582        <span class="bold">5.5591</span> |     ..x.......xxXXXXx...     |
 alcu_allocator      sl_alloc 1829947         3044          0.1663      50913        0.0121 |    .X...xx...........        |
 alcu_allocator    temp_alloc   12700           92          0.7244      49736        0.0119 |             ..xXXXXX..       |
 alcu_allocator     fix_alloc  183316            8          0.0044        425        0.0001 |       X  X     x x           |
 alcu_allocator     ets_alloc  182897            4          0.0022        127        0.0000 |        X    XX X             |
 alcu_allocator     std_alloc  182897            3          0.0016         99        0.0000 |       X      X X             |
 alcu_allocator  binary_alloc  204975            8          0.0039         85        0.0000 |      X Xx x  xx              |
 alcu_allocator  driver_alloc  182897            1          0.0005          0        0.0000 |        X                     |
 alcu_allocator literal_alloc     579            0          0.0000          0        0.0000 |                              |
 alcu_allocator      ll_alloc  182898            1          0.0005          0        0.0000 |         X                    |

</pre>

The issue seemed to be related to one specific lock. The `{class, id}`
format could be used to inspect a specific lock, and with the location
flag set, it prints the exact source location of the lock as well.

<pre class="small" style="color: #657b83; background-color: #fdf6e3;">
<b>iex> :lcnt.inspect({:alcu_allocator, :eheap_alloc}, locations: true, combine: true)</b>

                     location  #tries  #collisions  collisions [%]  time [us]  duration [%] histogram [log2(us)]
                    --------- ------- ------------ --------------- ---------- ------------- ---------------------
 'beam/erl_alloc_util.c':1809   16013         1160          <span class="bold">7.2441</span>    1046038        0.9328 |      .........xxXXXXx...     |
 'beam/erl_alloc_util.c':2081   28164         1142          <span class="bold">4.0548</span>     868892        0.7748 |     ..........xxXXXx....     |
 'beam/erl_alloc_util.c':6093   19881         1307          <span class="bold">6.5741</span>     831003        0.7410 |     .xX.... ..xxXXxx...      |
 'beam/erl_alloc_util.c':6559    7331          755         <span class="bold">10.2987</span>     242410        0.2162 |      .Xx......Xxxx.....      |
                  undefined:0     154            6          3.8961       3945        0.0035 |               x  Xxx         |
</pre>

I spent some time reviewing the available documentation related to
Erlang's memory allocator. Erlang uses a separate allocator for each
scheduler, so there should generally be no collision during memory
allocation calls. Erlang also utilizes a dirty scheduler to handle
various tasks, including garbage collection (GC). Unlike the normal
scheduler, the dirty scheduler doesn't have its own allocator;
instead, it shares a single allocator. While investigating the
`beam/erl_alloc_util.c` source code, I found several call sites
related to memory deallocation, which aligns with the theory that the
contention arises due to GC activity on the dirty scheduler. The
results from [msacc](https://www.erlang.org/doc/apps/runtime_tools/msacc.html) also indicated that a significant amount of CPU
time is being spent on garbage collection on the dirty schedulers.

<pre class="small" style="color: #657b83; background-color: #fdf6e3;">
<b>iex> :msacc.start(1000);:msacc.print()</b>

Average thread real-time    :  1000961 us
Accumulated system run-time : 10992566 us
Average scheduler run-time  :   596752 us

        Thread emulator     port      aux check_io       gc    other    sleep

Stats per thread:
     async( 0)    0.00%    0.00%    0.00%    0.00%    0.00%    0.00%  100.00%
       aux( 1)    0.00%    0.00%    0.44%    0.01%    0.00%    0.07%   99.48%
dirty_cpu_( 1)    0.00%    0.00%    0.00%    0.00%    0.00%    0.00%  100.00%
dirty_cpu_( 2)    0.37%    0.00%    0.00%    0.00%   <span class="bold">35.73%</span>    0.04%   63.86%
dirty_cpu_( 3)    0.00%    0.00%    0.00%    0.00%    0.00%    0.00%  100.00%
dirty_cpu_( 4)    0.00%    0.00%    0.00%    0.00%    0.00%    0.00%  100.00%
dirty_cpu_( 5)    0.00%    0.00%    0.00%    0.00%    0.00%    0.00%  100.00%
dirty_cpu_( 6)    0.00%    0.00%    0.00%    0.00%    0.00%    0.00%  100.00%
dirty_cpu_( 7)    0.65%    0.00%    0.00%    0.00%   <span class="bold">26.59%</span>    0.03%   72.73%
dirty_cpu_( 8)    0.00%    0.00%    0.00%    0.00%    0.00%    0.00%  100.00%
dirty_cpu_( 9)    0.23%    0.00%    0.00%    0.00%   <span class="bold">28.08%</span>    0.03%   71.66%
dirty_cpu_(10)    0.00%    0.00%    0.00%    0.00%    0.00%    0.00%  100.00%
dirty_cpu_(11)    0.00%    0.00%    0.00%    0.00%    0.00%    0.00%  100.00%
dirty_cpu_(12)    0.00%    0.00%    0.00%    0.00%    0.00%    0.00%  100.00%
dirty_cpu_(13)    0.15%    0.00%    0.00%    0.00%   <span class="bold">21.61%</span>    0.02%   78.23%
dirty_cpu_(14)    0.00%    0.00%    0.00%    0.00%    0.00%    0.00%  100.00%
dirty_cpu_(15)    0.00%    0.00%    0.00%    0.00%    0.00%    0.00%  100.00%
dirty_cpu_(16)    0.47%    0.00%    0.00%    0.00%   <span class="bold">13.26%</span>    0.02%   86.24%
dirty_io_s( 1)    0.00%    0.00%    0.00%    0.00%    0.00%    0.00%  100.00%
dirty_io_s( 2)    0.00%    0.00%    0.00%    0.00%    0.00%    0.00%  100.00%
dirty_io_s( 3)    0.00%    0.00%    0.00%    0.00%    0.00%    0.00%  100.00%
dirty_io_s( 4)    0.00%    0.00%    0.00%    0.00%    0.00%    0.00%  100.00%
dirty_io_s( 5)    0.00%    0.00%    0.00%    0.00%    0.00%    0.00%  100.00%
dirty_io_s( 6)    0.00%    0.00%    0.00%    0.00%    0.00%    0.00%  100.00%
dirty_io_s( 7)    0.00%    0.00%    0.00%    0.00%    0.00%    0.00%  100.00%
dirty_io_s( 8)    0.00%    0.00%    0.00%    0.00%    0.00%    0.00%  100.00%
dirty_io_s( 9)    2.24%    0.00%    0.00%    0.00%    0.00%    0.14%   97.61%
dirty_io_s(10)    0.00%    0.00%    0.00%    0.00%    0.00%    0.00%  100.00%
      poll( 0)    0.00%    0.00%    0.00%    5.88%    0.00%    0.00%   94.12%
 scheduler( 1)   56.34%    4.50%    2.80%    0.68%    1.98%    1.92%   31.78%
 scheduler( 2)   57.17%    4.20%    2.59%    0.66%    1.99%    2.23%   31.16%
 scheduler( 3)   63.33%    4.09%    2.57%    0.66%    1.95%    1.75%   25.65%
 scheduler( 4)   57.13%    3.94%    2.52%    0.70%    2.17%    1.73%   31.81%
 scheduler( 5)   58.30%    3.80%    2.40%    0.59%    1.96%    1.66%   31.29%
 scheduler( 6)   55.95%    4.18%    2.58%    0.69%    2.30%    1.76%   32.53%
 scheduler( 7)   57.02%    4.54%    2.77%    0.70%    2.26%    1.89%   30.81%
 scheduler( 8)   54.80%    4.14%    2.72%    0.66%    2.13%    1.82%   33.73%
 scheduler( 9)   58.94%    3.91%    2.70%    0.62%    1.59%    1.91%   30.33%
 scheduler(10)   57.23%    4.22%    2.62%    0.67%    2.03%    2.13%   31.10%
 scheduler(11)   56.40%    4.20%    2.61%    0.68%    1.87%    1.95%   32.29%
 scheduler(12)   55.24%    4.02%    2.59%    0.63%    2.10%    1.94%   33.48%
 scheduler(13)   54.48%    4.75%    2.63%    0.75%    2.17%    2.07%   33.15%
 scheduler(14)   41.82%    3.37%    1.99%    0.56%    1.34%    1.49%   49.43%
 scheduler(15)    9.51%    0.47%    0.87%    0.19%    0.27%    0.58%   88.12%
 scheduler(16)    0.00%    0.00%    0.33%    0.06%    0.00%    0.25%   99.36%

Stats per type:
         async    0.00%    0.00%    0.00%    0.00%    0.00%    0.00%  100.00%
           aux    0.00%    0.00%    0.44%    0.01%    0.00%    0.07%   99.48%
dirty_cpu_sche    0.12%    0.00%    0.00%    0.00%    7.83%    0.01%   92.05%
dirty_io_sched    0.22%    0.00%    0.00%    0.00%    0.00%    0.01%   99.76%
          poll    0.00%    0.00%    0.00%    5.88%    0.00%    0.00%   94.12%
     scheduler   49.60%    3.65%    2.33%    0.59%    1.76%    1.69%   40.38%
</pre>

Fortunately, this issue has already been addressed in [otp-24.2+](https://github.com/erlang/otp/pull/5187),
and it is controlled by a flag named `+Mdai`. Setting this flag to
`max` provides an independent allocator for each dirty scheduler.

I also experimented with [super carrier](https://www.erlang.org/doc/apps/erts/supercarrier.html) by pre-allocating 32GB of
RAM. This change led to a shift in the CPU usage split, with a
noticeable reduction in system CPU time compared to user CPU time. The
number of page faults also decreased, which I assume is related to the
reduction in system CPU time. Overall, this change seemed to save
roughly more than 10% of CPU time. While it's difficult to calculate
the exact savings due to multiple variables being adjusted, we
ultimately settled on the configuration: `+Mdai max +MMscs 32768
+MMsco false`.

Once the fix for the memory allocator was implemented, the
`eheap_alloc` was mostly gone, and under high load, the wait duration
of `db_hash_slot` started to increase. The issue with locks is that
when one bottleneck is removed, the next one takes its place.

<pre class="small" style="color: #657b83; background-color: #fdf6e3;">
<b>iex> :lcnt.conflicts()</b>

                       lock    id    #tries  #collisions  collisions [%]  time [us]  duration [%]
                      -----   ---   ------- ------------ --------------- ---------- -------------
               <span class="bold">db_hash_slot</span>  6720  14550391       207204          1.4240  104478530       <span class="bold">36.5303</span>
                  run_queue    18 149169186      1846889          1.2381   15757389        5.5095
                  proc_main 17659  47119883       308688          0.6551   13635415        4.7675
             alcu_allocator   154   5528359         7396          0.1338    3241577        1.1334
                  erts_mmap     2   1678465       210117         12.5184    2434174        0.8511
                   pix_lock  1024     64208           31          0.0483    1130359        0.3952
                  port_lock  8538  17741611        14465          0.0815     767397        0.2683
                proc_status 17659  47387203        23613          0.0498     247990        0.0867
                     db_tab   302  89190210         8624          0.0097     240916        0.0842
                   proc_btm 17659   6399333        19711          0.3080     234541        0.0820
               drv_ev_state   128  13943321         7285          0.0522     213674        0.0747
                       mseg    17    357701           68          0.0190     141553        0.0495
                  proc_msgq 17659  58578218        50508          0.0862      66442        0.0232
            port_sched_lock  8540  10925389         4531          0.0415      14092        0.0049
              process_table     1    193629          124          0.0640       1093        0.0004
                   atom_tab     1 151663081           21          0.0000         92        0.0000
 dirty_run_queue_sleep_list     2    550178           58          0.0105         43        0.0000
              dirty_gc_info     1     83698            9          0.0108          4        0.0000
:ok
</pre>

Simply looking at `:lcnt.inspect(:db_hash_slot)` immediately revealed
the problem. We were using [telemetry_metrics_prometheus](https://github.com/beam-telemetry/telemetry_metrics_prometheus), which
relied on a single [ets](https://www.erlang.org/doc/apps/stdlib/ets.html) table. While ets supported [concurrent](https://www.erlang.org/doc/apps/stdlib/ets.html#module-concurrency)
read and write operations, it became a bottleneck under high load.


<pre class="small" style="color: #657b83; background-color: #fdf6e3;">
<b>iex> :lcnt.inspect(:db_hash_slot)</b>

         lock                      id  #tries  #collisions  collisions [%]  time [us]  duration [%] histogram [log2(us)]
        -----                     --- ------- ------------ --------------- ---------- ------------- ---------------------
 db_hash_slot <span class="bold">prometheus_metrics_dist</span> 1897002        70810          3.7327   17451758        4.1598 |     .....xXX...............  |
 db_hash_slot <span class="bold">prometheus_metrics_dist</span>  898806        12730          1.4163    6976784        1.6630 |      ....xxX..............   |
 db_hash_slot <span class="bold">prometheus_metrics_dist</span> 1589817         9317          0.5860    6691033        1.5949 |     .xxXXxx................  |
 db_hash_slot <span class="bold">prometheus_metrics_dist</span>  864521         1893          0.2190    6078246        1.4488 |     ...xxX.x..............   |
 db_hash_slot <span class="bold">prometheus_metrics_dist</span> 1000479         3127          0.3126    5075027        1.2097 |     .xxXXXx......... .....   |
 db_hash_slot <span class="bold">prometheus_metrics_dist</span> 1083966         3313          0.3056    4273343        1.0186 |     ..xXXx................   |
 db_hash_slot        shards_partition    3947           30          0.7601     908902        0.2166 |                 .  . ..XX.   |
 db_hash_slot        shards_partition    1588            6          0.3778     236682        0.0564 |                       X Xx   |
 db_hash_slot        shards_partition     400            4          1.0000     163255        0.0389 |                      X XXX   |
 db_hash_slot        shards_partition    1380            6          0.4348     136208        0.0325 |                       xX     |
 db_hash_slot <span class="bold">prometheus_metrics_dist</span>  124562          150          0.1204     119496        0.0285 |      .....xX... .   ...      |
 db_hash_slot <span class="bold">prometheus_metrics_dist</span>  269110          316          0.1174      95729        0.0228 |     .xxXXx........ . ...     |
 db_hash_slot <span class="bold">prometheus_metrics_dist</span>  105175           68          0.0647      90335        0.0215 |      xxXXXxx..  x..xXxx      |
 db_hash_slot        shards_partition     400            1          0.2500      80775        0.0193 |                          X   |
 db_hash_slot      <span class="bold">prometheus_metrics</span> 1085784        10155          0.9353      74510        0.0178 |     .....X.........          |
 db_hash_slot        shards_partition    1191            8          0.6717      70953        0.0169 |                   x XxxX     |
 db_hash_slot        shards_partition     351            2          0.5698      49079        0.0117 |                        X     |
 db_hash_slot        shards_partition    1141            5          0.4382      47324        0.0113 |                    x xX      |
 db_hash_slot <span class="bold">prometheus_metrics_dist</span>   74890           53          0.0708      45480        0.0108 |      ...Xx.Xx..... ..x.      |
 db_hash_slot        shards_partition     368            1          0.2717      43281        0.0103 |                         X    |
:ok
</pre>

Fortunately, someone else had faced the exact same problem and
[solved](https://elixirforum.com/t/peep-efficient-telemetrymetrics-reporter-supporting-prometheus-and-statsd/55901/7#p-344584-peep-v330-3) it for us. The solution was to use one **ets** table per
scheduler. Once we switched to the [peep](https://github.com/rkallos/peep) library, the
`db_hash_slot` no longer appeared as the top bottleneck.


<pre class="small" style="color: #657b83; background-color: #fdf6e3;">
<b>iex> :lcnt.conflicts()</b>

              lock   id    #tries  #collisions  collisions [%]  time [us]  duration [%]
             -----  ---   ------- ------------ --------------- ---------- -------------
         run_queue   18 156178443      1754050          1.1231    5528276        1.1750
<127.0.0.1.4911.0>    5  21670879       152885          0.7055    2467737        0.5245
    alcu_allocator  154   4515554         2227          0.0493    1724497        0.3665
      db_hash_slot 7616  16602840           85          0.0005     811074        0.1724
         erts_mmap    2   1041183       100172          9.6210     792307        0.1684
          pix_lock 1024     17687           19          0.1074     347020        0.0738
   user_drv_writer    5   2068081         7754          0.3749     210819        0.0448
            db_tab  316 101504868        11294          0.0111     200130        0.0425
      drv_ev_state  128  16028857         6865          0.0428     143241        0.0304
   redis_shard_0_5    5   6741258        12497          0.1854      93468        0.0199
   redis_shard_0_1    5   6722557        12383          0.1842      92689        0.0197
   redis_shard_0_3    5   6745599        12483          0.1851      89651        0.0191
#Port<127.0.0.1.0>    1    990558         2325          0.2347      89150        0.0189
   redis_shard_0_4    5   6713662        12269          0.1827      88936        0.0189
   redis_shard_0_7    5   6759899        12583          0.1861      86267        0.0183
   redis_shard_0_2    5   6736890        12375          0.1837      82596        0.0176
#Port<127.0.0.1.0>    1    993415         2350          0.2366      82142        0.0175
   redis_shard_0_6    5   6743413        12384          0.1836      80555        0.0171
#Port<127.0.0.1.0>    1    994243         2220          0.2233      80386        0.0171
#Port<127.0.0.1.0>    1    994250         2323          0.2336      79686        0.0169
</pre>

At this point, we were able to reach up to **95%** CPU
utilization. Given the improvements and the limited potential for
further optimization, I decided to call it a day and not investigate
further.

<link rel="stylesheet" href="/public/css/erlang-vm-tuning.css"/>
