---
layout: post
title : Recursion and Loops
header : Recursion and Loops
meta_keywords: recursion , loops
meta_description: recursion , loops
---

Write a program to find the nth number in the fibonacci series

Imperative Programmer (Earlier)
---------------------

{% highlight java %}
public void int fib(int n) {
    int a = -1,b = 1;
    for(int i = 0 ; i < n ; i++){
      c = a + b;
      a = b;
      b = c;
    }
    return b;
}
{% endhighlight %}

`can you write this in any other way?`
`hmm.. blink...`


Functional Programmer (Now)
---------------------

{% highlight scheme %}
(define (fib x)
  (if (or (= x 0) (= x 1))
      x
      (+ (fib (- x 2)) (fib (- x 1)))))
{% endhighlight %}

`can you write this in any other way?`
`hmm.. well.. i can write it using tail recursion`

{% highlight scheme %}
(define (fib x)
   (define (fib-iter a b count)
     (if (= 0 count)
	 a
	 (fib-iter b (+ a b) (- count 1))))
  (fib-iter 0 1 x))
{% endhighlight %}
