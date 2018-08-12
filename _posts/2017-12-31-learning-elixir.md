---
layout: post
title: Mastering Elixir
tags: elixir review
---

This is written for someone who is already a programmer and familiar
with two or three programming languages. For someone new to
programming, the route proposed here might not work.

### Do I need to learn Erlang?

Yes, Although you might not write lot of Erlang code, you need to be
able to read Erlang code and browse through the Erlang documentation
to figure out the details.


Elixir differs from the mainstream languages in three main aspects.

### Immutability

Values in Elixir are immutable, it can't be changed in-place. This kind
of trips up a lot of programmers who are used to c or Java where the
predominant style is to mutate values in-place.

### Concurrency

Most of the languages support shared state concurrency. Multiple
threads will share a common state and they communicate with each other
by mutating the state in-place. The actor model approach taken by Elixir is
completely different from this model.

### Macro

None of the mainstream languages supports macro. Unless you already
know any Lisp-like language, you might not have much idea about what
is macro and how it's useful.


Trying to learn all the three aspects of the language at the same time
might not work out for everyone. The easy way is to learn them one by
one.

The
[getting started guide](http://elixir-lang.github.io/getting-started/introduction.html)
provides a nice introduction to the language tools and syntax. Read
the first 22 chapters. Depending on your background, by the time you
finish this, you would be able to write useful programs in Elixir.

[Learn You Some Erlang](http://learnyousomeerlang.com/) is a great
book. The first part of the book focus on the functional aspect of the
language, the rest of the book focus on the concurrency part.

[Elixir in Action](https://www.manning.com/books/elixir-in-action) is
another great book. Most of the material covered here is already
covered by [Learn You Some Erlang](http://learnyousomeerlang.com/), but it's nice to go through them
once again and understand how the Erlang code maps to Elixir code.

Macro is something which you would not use in everyday
programming. But it's invaluable in some situations. I could not find
any good introductory book on macros in Elixir. The best way I could find is to
read [On Lisp](http://www.paulgraham.com/onlisp.html) or
[Let Over Lambda](https://letoverlambda.com/). Once you understood
it's use cases, you can read the
[Meta Programming](http://elixir-lang.github.io/getting-started/meta/quote-and-unquote.html)
section in
[getting started guide](http://elixir-lang.github.io/getting-started/introduction.html)
and also read
the
[Metaprogramming Elixir](https://pragprog.com/book/cmelixir/metaprogramming-elixir) book.

[Making reliable distributed systems in the presence of software errors](http://erlang.org/download/armstrong_thesis_2003.pdf)
is written by Joe Armstrong. It explains the reason for some of the
language design decisions and provides advice on how to organize large-scale projects.

[Erlang in Anger](https://www.erlang-in-anger.com/) is written by the
same guy who wrote
[Learn You Some Erlang](http://learnyousomeerlang.com/). It explains
how to debug or find problems in production systems. It's worth a skim
through.
