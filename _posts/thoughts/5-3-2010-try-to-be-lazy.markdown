---
layout: post
title: Try to be Lazy
header : Try to be Lazy
meta_keywords: shell script , time saver , lazy , DRY , programmer , automate
meta_description: shell script are time saver
---

Don't Repeat Yourself
---------------------
Every time when i start to do some work, i find myself doing some  repetitive, non productive work again
and again. To set up the working envirorment, i used to type a series of commands in the system.For example
consider i am going to write a new post for my blog, i will do the following things

		Press window + R
		Type cmd
		Type D:
		Type D:\Git_Repo\ananthakumaran.github.com
		Type jekyll --server --auto
		Click GitBash shortcut icon in the desktop
		Type cd D:
		Type  D:\Git_Repo\ananthakumaran.github.com
		Click My computer icon in the Desktop
		DoubleClick D drive
		Go to the _post folder
		right click and create a new file   

Oh My God!, I am doing the same task again and again, for every changes i make in 
my website. Don't i write programs to automate this kind of work. Then why i am
not automating this.

Be lazy
-------
I am very lazy. Being a lazy person is good in some ways. Sometimes it turnsout, i neednot do some work, otherwise i would have done it.
Ok is it right to be a lazy programmer?. Yes it is. Lazy programmers are the best programmers in the world :). 
Now i am going to try hard to be a lazy programmer. So i am going to do all this repetetive work in a single click.

Shell Script
------------
Shell script is there to rescue us. "Oh! i never written anything in very low level language.
Can i write shell script in windows", Yes we can. Although it is a very ugly language,
it is very useful to do some work. Here is the script to do the above mentioned work in a single click.

{% highlight bat %}
@echo off
:: start the Git Bash
start "Git Bash" /DD:\Git_Repo\ananthakumaran.github.com  "cmd" /c ""e:\Program Files\Git\bin\sh.exe" --login -i "
:: open the project directory in the explorer
start D:\Git_Repo\ananthakumaran.github.com
:: go to the project directory
cd /d D:\Git_Repo\ananthakumaran.github.com
:: start the server
jekyll --server --auto
{% endhighlight %}

Automate everything 
-------------------
We can save lot of time by automating certain things. It may take some time to set up things in the
first day. But you will find yourself more productive from the second day onwards.   

I need to do some typing practice every day to keep up with the old speed:).

