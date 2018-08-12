---
layout: post
title: Visualization of Bit Reversal Ring
viz: true
tags: visualization
---

> Bit reversal ring of size z could be defined as the reverse of the
> binary representation of each number x in the sequence 0 to z - 1.

When the size of the ring is 2<sup>n</sup>, the reversal just
rearranges the numbers in the sequence. It doesn't remove or introduce
any new number to the list.

In the first two visualizations, line represents a interchange and the
color of the line represents distance between the two numbers.

<svg id="ring"></svg>
<svg id="linear"></svg>


> Two list of numbers a and b can be said as <strong>order
> equivalent</strong> if and only if a[i] < a[j] = b[i] < b[j] for
> every i and j.

An example would be [1, 5, 3] and [2, 6, 4]. The bit reversal
operation preserves some of the order equivalence of sub groups within
the ring. Each arch represents a group of numbers after bit reversal
operation. Groups with same order share same color.  The size of the
group increases as you go from top to bottom. The size of the ring (4,
8, 16) increases as you go from left to right.

For example, the ring in the column 2 and row 3 represents the groups
<span style="color: #1f77b4">(0,4,2)</span>,
<span style="color: #aec7e8">(4,2,6)</span>,
<span style="color: #ff7f0e">(2,6,1)</span>,
<span style="color: #ffbb78">(6,1,5)</span>,
<span style="color: #1f77b4">(1,5,3)</span>,
<span style="color: #aec7e8">(5,3,7)</span>,
<span style="color: #ff7f0e">(3,7,0)</span>,
<span style="color: #ffbb78">(7,0,4)</span>.


<svg id="symmetry"></svg>

<script src="/public/js/bit-reversal-ring.js"></script>
