---
layout: post
title: Visualization of backoff functions
viz: true
---

Failures are inevitable in any system. How it should be handled varies
from one system to another. In job processing systems, a common
approach is to retry the failed jobs for a fixed number of times
before they are considered as permanent failures. A **backoff**
function is used to determine the wait time between successive
retries.

Let's look at a simple backoff function, which retries after a fixed
wait time -- 5 minutes in this case.

```js
function constant(retryCount) {
   return 5 * 60;
}
```

Let's assume there are 100 job failures, the chart below shows when
each of the jobs would be retried again. Each dot represents a time at
which a job is retried. The color is varied based on the retry count.

<svg id="constant"></svg>

An exponential backoff function increases the wait time exponentially
for each retry.

```js
function exponential(retryCount) {
    var min = 3 * 60;
    var base = 2;
    return min + (Math.pow(base, retryCount) * 60);
}
```
<svg id="exponential"></svg>

The above two are pure functions, given an input they will always
return the same output. If n jobs failed at the same time, then all
the n jobs will be retried at the same time, which could cause
[thundering herd](https://en.wikipedia.org/wiki/Thundering_herd_problem)
problem. A random component called jitter is normally added to fix
this problem. The last component in the function below is a random
jitter that is scaled based on the retry count.


```js
function sidekiq(retryCount) {
    return Math.pow(retryCount, 4) + 15 +
        (Math.random() * 30 * (retryCount + 1));
}
```

<svg id="sidekiq"></svg>
<svg id="sidekiq-lines"></svg>


The above function is good enough for most of the use cases. There are
still some gaps where your job processing system would be idle. The
below function tries to distribute the load evenly by increasing the
randomness.

```js
function between(a, b) {
    return a + (Math.random() * (b - a));
}
function buckets(retryCount) {
    var exp = 3;
    return between(Math.pow(retryCount, exp),
                   Math.pow(retryCount + 2, exp));
}
```

<svg id="buckets"></svg>
<svg id="buckets-lines"></svg>

Although the load distribution is better than the previous version,
the wait time between two retries starts to deviate a lot. I wonder if
there are any stateless functions which could provide better distribution
without much deviation in wait time.

<link rel="stylesheet" href="/public/css/backoff.css"/>
<script src="/public/js/moment.min.js"></script>
<script src="/public/js/backoff.js"></script>
