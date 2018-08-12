---
layout: post
title : SQL and Relational Theory
tags: review
---

At work, I had to write a JQPL — Yet another poorly documented
objected oriented query language — query which involved 3 tables. It
was little frustrating because of the lack of proper documentation
about JQPL and my poor mental model of the join operation. I almost
forgot most of the SQL I had learned during my undergraduate years. I
blame hibernate, active-record et al. for the decay of my SQL
knowledge.

I finally decided to read the "SQL and Relational Theory" book by
C.J. Date, which had been sitting on my bookshelf for more than 6
months. His writing style is a bit pedantic, but not dry. You will
probably get used to it after one or two chapters.

In the initial chapters, he reiterates the fact that SQL is not a
faithful implementation of Relational Model because SQL allows
duplicates and null, which are not allowed in Relation Model, then
goes on to explain all kind of problems introduced by this mistake — I
wasn't aware of Three-valued logic used by SQL.

Then he introduces the necessary vocabulary like relation, relvar,
tuple etc. He uses a language called Tutorial D — seems like a
well-thought language than SQL — alongside with SQL to explain most of
the concepts.

Chapter 5 and 6 explain relational operators in a rigorous form, which
in my opinion, is the real meat of the book. You might come across
some new concepts — or old concepts described in new ways — like image
relation and relation-valued attributes, also touches on recursion and
cycle, which I hadn't given much thought in the relational context
before.

In later chapters, he explains constraints, views, the relation
between logic and SQL, and how to map from logic to SQL. He also
bashes SQL along the way for many bad design decisions and provides
alternatives — Whether the alternatives are good or bad is difficult
to judge, without hearing arguments from the other side.

Overall, I would say the book is rigorous, thought-provoking and worth
a read.
