---
layout: post
title: Scala _ [underscore] magic
header : Scala _ [underscore] magic
meta_keywords: scala , underscore , underscore magic
meta_description: scala underscore magic
---

I started learning Scala a few days before. Initially i was annoyed   by 
the use of too many symbols in Scala. Especially i was confused by the `_` and its different meaning in different
places. After a few days of research(aka search), i felt better and i started to love its syntax. Ok, lets see the usage of `_` in Scala.

{% highlight ruby %}
"Alert" : "I am a Scala n00b"
{% endhighlight %}

Pattern Matching
----------------

In Scala, [pattern matching](http://www.scala-lang.org/node/120) is somewhat similar to java switch statement.
But it is more powerful.

{% highlight scala %}
 def matchTest(x: Int): String = x match {
    case 1 => "one"
    case 2 => "two"
    case _ => "anything other than one and two"
  }
{% endhighlight %}

In Scala, each selector will be matched with the patterns in the order they appear and the first match will be executed.
`_` acts like a wildcard. It will match anything. Scala allows nested patterns, so we can nest the `_` also.Lets see
another example that uses `_` in nested pattern.

{% highlight scala %}
expr match {
  case List(1,_,_) => " a list with three element and the first element is 1"
  case List(_*)  => " a list with zero or more elements "
  case Map[_,_] => " matches a map with any key type and any value type "
  case _ =>
  }
{% endhighlight %}



Anonymous Functions
-------------------

Scala represents [anonymous functions](http://www.scala-lang.org/node/133) with a elegant syntax.
The `_` acts as a placeholder for parameters in the anonymous function. The `_` should be used only
once, But we can use two or more underscores to refer different parameters.


{% highlight scala %}
List(1,2,3,4,5).foreach(print(_))
{% endhighlight %}


{% highlight scala %}
List(1,2,3,4,5).foreach( a => print(a))
{% endhighlight %}



Here the _ refers to the parameter. The first one is a short form of  the 
second one. Lets look at another example which take two parameters.


{% highlight scala %}
val sum = List(1,2,3,4,5).reduceLeft(_+_)
{% endhighlight %}


{% highlight scala %}
val sum = List(1,2,3,4,5).reduceLeft((a, b) => a + b)
{% endhighlight %}

There is a good [post](http://www.codecommit.com/blog/scala/quick-explanation-of-scalas-syntax) which explains the inner details of the above example.



import
------

In scala, `_` acts similar to `*` in java while importing packages.

{% highlight scala %}
// imports all the classes in the package matching
import scala.util.matching._
// imports all the members of the object Fun. (static import in java)
import com.test.Fun._
// imports all the members of the object Fun but renames Foo to Bar
import com.test.Fun.{ Foo => Bar , _ }
// imports all the members except Foo. To exclude a member rename it to _ 
import com.test.Fun.{ Foo => _ , _ }

{% endhighlight %}


Properties
----------

In scala, a getter and setter will be implicitly defined for all non-private var in a object.
The getter name is same as the variable name and  `_=` is added for setter name. We can define
our own getters and setters. This is looking similar to Ruby getters and setters. Ok lets see
an example which uses the getter and setters.

{% highlight scala %}
class Test {
   private var a = 0
   def age = a
   def age_=(n:Int) = {
      require(n>0)
      a = n
   }
}
{% endhighlight %}


{% highlight scala  %}
val t = new Test
t.age = 5
println(t.age)
{% endhighlight %}

Functions
---------

Scala is a functional language. So we can treat function as a  normal variable. If you try to
assign a function to a new variable, the function will invoked and the result will be assigned to
the variable. This confusion occurs due to the optional braces for method invocation. We should
use `_` after the function name to assign it to another variable.

{% highlight scala %}
class Test {
  def fun = {
    // some code
  }
  val funLike = fun _ 
}
{% endhighlight %}
