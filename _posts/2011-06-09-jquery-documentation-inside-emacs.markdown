---
layout: post
title: jQuery documentation inside Emacs
header: jQuery documentation inside Emacs
meta_keywords: jquery documentation emacs
meta_descripton: jQuery documentation inside Emacs
tags: emacs jquery
---

Recently I found myself switching between Emacs and browser to refer
the jQuery documentation. So I looked around and found
[XML dump](http://api.jquery.com/api/) of the jQuery
documentation. Now I have the data and just have to figure out a way
to display it inside emacs. Parsing the XML file every time to look-up
a method documentation will be very slow. So I wrote a converter which
will parse the XML dump and spit out elisp code. The generated elisp
code will look as follows.

{% highlight cl %}
(push "$.grep" jquery-doc-methods)
(puthash
 "$.grep"
 (quote (("name" . "$.grep")
         ("signatures"
          "$.grep"
          (("array" "The array to search through." nil nil)
           ("function(elementOfArray, index)" "..." nil nil)))
         ("longdesc"
          (text . "The $.grep() method ...")
          (js . "$.grep( [0,1,2], function(n,i){
				             return n > 0;
                                        },true);"))))
 jquery-doc-hash)
{% endhighlight %}

Now all I have to do is configure
[auto complete](http://www.emacswiki.org/emacs/AutoComplete) to use
this data and write some
[code](https://github.com/ananthakumaran/jquery-doc.el) to display the
documentation in a buffer.
