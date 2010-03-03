---
layout: post
title: History of Hello World
header : History of Hello World
meta_keywords: history , hello world , history of hello world
meta_description: hello world history
---

First Program
-------------
Can you remember the first ever program you have written, Well most of us would have written the 
a program that prints nothing but `'hello world'`. It is a tradition in programming that whenever we
learn a new programming language we will start with a `'hello world'` program. This trivial program  can
be helpful to make sure that our compiler and other envirorment settings working properly.

History
-------
Ok who started this habit. This program was first used in the book 
[THE C PROGRAMMING  LANGUAGE] [cbook]
written by Brian W.Kernighan and Dennis M.Ritchie.

{% highlight c %}
	#include <stdio.h>
	int main() 
	{
		printf("hello, world\n");
	}
{% endhighlight %}
It is also claimed that the `'hello world'` program was used by Kernighan's in 1972 
in a Tutorial Introduction to the Language B
{% highlight c %}
	main( ) {
	extrn a, b, c;
	putchar(a); putchar(b); putchar(c); putchar('!*n');
	}
	a 'hell';
	b 'o, w';
	c 'orld';
{% endhighlight %}
I looks like 'C' copied the `'hello world'` from program 'B' :).

Hello World 
-----------
Ok, What about writing a `'hello world'` program in all the languages you know. Wolfram Rösler have
already written(collected) [hello world in different languages](http://www.roesler-ac.de/wolfram/hello.htm).
Enough talking lets go and write a `'hello world'` program.

|source [wikipedia](http://en.wikipedia.org/wiki/Hello_world_program)|

[cbook]: <http://en.wikipedia.org/wiki/The_C_Programming_Language_(book)> "The c programming language book"
