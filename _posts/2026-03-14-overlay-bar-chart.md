---
layout: post
title: Overlay Bar Chart
plot: true
date: 2026-03-14 11:04 +0530
---
In this post, I will discuss the **overlay bar chart**. There is
plenty of material on **stacked** and **grouped** bar charts, but
relatively little written about overlay bar charts. This post attempts
to address that gap.

There are [many](https://d3js.org/) ways to visualize a dataset. Some
approaches are better suited than others depending on the nature of
the data. The same applies to overlay bar charts. They work well when
certain conditions are met. We will start with a generic chart and
then see whether it can be improved.

The data we are going to look at contains two metrics that are highly
dependent on each other. The example here is **ad impressions** and
**ad clicks**. There is a strict relationship between these two
metrics: clicks can never exceed impressions, because a user must
first see an ad before clicking it. This type of relationship appears
in many real-world metrics where one action can happen only after
another. Examples include **emails received vs. emails opened**,
**page views vs. sign-ups**, **product views vs. purchases**,
**searches vs. bookings**, and **video plays vs. likes**. In all these
cases, the second metric represents a subset of the first.

In this post, I will use ad **impressions** and **clicks** as the example, but
the same idea applies to any pair of metrics with this type of
relationship.


### Grouped Bar Chart

<div id="grouped"></div>

Let’s start with a grouped bar chart. This chart makes three
comparisons easy: you can compare **impressions across days**, compare
**clicks across days**, and compare **impressions and clicks within
the same day**.


<div id="grouped-large"></div>

Let’s increase the number of data points. The chart now starts to look
a bit noisy. Can we do better? Can we make better use of the available
horizontal space?

### Stacked Bar Chart

<div id="stacked"></div>
<div id="stacked-large"></div>

This looks visually cleaner and makes better use of horizontal
space. However, an important trade-off appears. We can still compare
**impressions across days**, but we can no longer easily compare
**clicks across days**. Since clicks are stacked on top of
impressions, the visual baseline changes, which makes height
comparisons difficult.

We also lose the ability to quickly compare **impressions vs. clicks**
for a specific day. For example, if clicks are 30% of impressions,
that relationship is no longer obvious because the bars are stacked
rather than placed side by side. Instead, the chart emphasizes the
**sum of impressions and clicks**, which is usually not a meaningful
metric in this context.

### Overlay Bar Chart

<div id="overlay"></div>
<div id="overlay-large"></div>

Given that clicks can never be greater than impressions, we can place
the bars directly on top of each other. The impressions bar forms the
full height, and the clicks bar sits within it because it is always
smaller.

This layout retains all the advantages of the grouped bar chart. You
can still compare **impressions across days** and **clicks across
days** because both metrics share the same baseline. You can also
compare **impressions and clicks within a specific day**, since both
bars start from zero and their heights remain directly comparable.

At the same time, the chart uses significantly less horizontal space
than a grouped bar chart. Instead of placing the two bars side by
side, the overlay approach combines them into the same position while
preserving the relationships between the metrics.



### Variations: Inset and Shift

<div id="overlay-inset"></div>
<div id="overlay-shifted"></div>

You might wonder how to visually distinguish this from a stacked bar
chart, especially if both appear in the same report. One simple
approach is to use a slight visual offset.

For example, instead of using a full-width bar for clicks, you can
render it slightly narrower. This creates a small inset, making it
immediately clear that the clicks bar is overlaid inside the
impressions bar rather than stacked on top of it.

Another option is to apply a small horizontal shift. A large shift
would effectively turn it into a grouped bar chart, but a subtle shift
keeps the bars visually connected while still signaling that one bar
overlays the other.

### Conclusion

Overlay bar charts work well when two metrics follow the rule **A ≤
B**, where **A** is always a subset of **B**. In practical terms, this
usually means measuring how many users completed an action out of the
total number who had the opportunity to do it. For example, out of all
**ad impressions**, how many resulted in **clicks**; out of all
**emails delivered**, how many were **opened**; or out of all
**product views**, how many led to a **purchase**.

In these situations, the smaller metric is typically the outcome or
success event, and it is almost always interpreted in relation to the
larger metric. The overlay bar chart keeps this relationship visible
while using less horizontal space than a grouped bar chart. When you
have many categories or time points, this makes the chart more compact
without losing the ability to compare the two metrics.


<link rel="stylesheet" href="/public/css/overlay-bar-chart.css"/>
<script src="/public/js/overlay-bar-chart.js"></script>
