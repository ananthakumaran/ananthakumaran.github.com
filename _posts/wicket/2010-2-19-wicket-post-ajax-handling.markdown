---
layout: post
title: Wicket Post Ajax Handling
header : Wicket Post Ajax Handling
meta_keywords: wicket , ajax , wicket post ajax , wicket ajax internals
meta_description: wicket post ajax handling
---

Wicket Ajax Hooks
-----------------

If you want to do something before and after every ajax call you would do that
by registering the wicket ajax callbacks as follows.

{% highlight javascript %}
// check whether the page contains any ajax links
if (Wicket.Ajax) {
	Wicket.Ajax.registerPreCallHandler(preAjaxHandler);
	Wicket.Ajax.registerPostCallHandler(successHandler);
	Wicket.Ajax.registerFailureHandler(failureHandler);
}
{% endhighlight %}


Problem
-------

Most of the time you need to update or add event handlers or do some initialization on 
the newly added DOMs. But you don't know Which DOMs are updated by wicket.wicket doesn't
call your post handlers with the list of newly added DOMs.


Solution
--------

You have do it by yourself.Ok let start by creating a Ajax event Handler

{% highlight javascript %}

MyApp.Ajax = {
	// contains the list of handler to be invoked
	// after ajax response
	postAjaxHandlers : [],
	// contains the ids of the changed elements
	changedDomIds : [],
	// registers the post ajax handles
	registerPostAjax : function(fn) {
		this.postAjaxHandlers.push(fn);
	},
	// this should be invoked by the the wicket
	handle : function(changed) {
		this.changedDomIds = changed;
	},
	// fires the post ajax event with collection of updated dom
	firePostHandlers : function() {
		var that = MyApp.Ajax;
		// fire the hanldler only if there is updated dom ids
		if (!that.changedDomIds.length == 0) {
			var selector = '';
			$.each(that.changedDomIds, function() {
				selector += '#' + this + ',';
			});
			var elements = $(selector);
			// invoke the handlers
			$.each(that.postAjaxHandlers, function() {
				this(elements);
			});
			// clear the ids
			that.changedDomIds = [];
		}
	}
};

MyApp.Ajax.registerPostAjax(function(changed$){
	// do you work here
	changed$.find('mydiv.myclass');
});

// register the handlers
$(document).ready(function() {
	if (Wicket.Ajax) {
	Wicket.Ajax.registerPostCallHandler(MyApp.Ajax.firePostHandlers);
	}
});

{% endhighlight %}

Now we finished our client side work. Ok let start our server side work.
Add this function to your base class;

{% highlight java %}
/**
 * fires a event with the collection of all the updated dom elements after
 * the wicket ajax response. To subscribe the event call the
 * <code>MyApp.Ajax.registerPostAjax</code>. Your callback function
 * will be called with a jQuery Wrapped set of all the update dom as the
 * first argument.
 * 
 * NOTE: call this only once after all the components are added to the
 * target
 * 
 * 
 * @param target
 *            ajax target
 */
public void firePostAjaxUpdateEvent(final AjaxRequestTarget target)
{
	final StringBuffer script = new StringBuffer(" MyApp.Ajax.handle([");
	for (final Component component : target.getComponents())
	{
		script.append("\"" + component.getMarkupId() + "\",");
	}
	script.append("])");

	target.getHeaderResponse().renderOnDomReadyJavascript(script.toString());
}
{% endhighlight %}

Now if you want to intialize something on the newly added DOMs simply call this 
method and a event with the list of updated DOMs will be fired on the client side.
{% highlight java %}
@Override
protected void onSubmit(final AjaxRequestTarget target)
{
	// add all the components
	firePostAjaxUpdateEvent(target);
}
{% endhighlight %}

Your comments are welcome.