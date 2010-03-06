---
layout: post
title: Wmd Editor in Wicket
header : Wmd Editor in Wicket
meta_keywords: Wmd editor , wmd-editor , wmd editor wicket
meta_description: wmd editor in wicket
---
i guess this post needs no explanation

RichEditor.java
---------------
{% highlight java %}

import org.apache.wicket.ResourceReference;
import org.apache.wicket.markup.html.IHeaderContributor;
import org.apache.wicket.markup.html.IHeaderResponse;
import org.apache.wicket.markup.html.form.FormComponentPanel;
import org.apache.wicket.markup.html.form.TextArea;
import org.apache.wicket.model.IModel;
/***
* WMD rich Editor
* @author Ananth
*/
public class RichEditor extends FormComponentPanel implements
IHeaderContributor
{
private static final long	serialVersionUID	= 1L;
/*** text area */
private TextArea			textArea;
/***
* constructor
*
* @param id
*            id
* @param model
*            model for the textarea
*/
public RichEditor(String id, IModel model)
{
super(id, model);
add(textArea = new TextArea("textarea", model));
}
protected void convertInput()
{
// TODO filter any javascript in the markup
setConvertedInput(textArea.getConvertedInput());
}
 public void renderHead(IHeaderResponse response)
{
// jquery
response.renderJavascriptReference("js/jquery/jquery.min.js");
// TextArea Resizer
ResourceReference resizeRef = new ResourceReference(getClass(),"jquery.textarearesizer.js");
response.renderJavascriptReference(resizeRef);
response.renderOnDomReadyJavascript("$('textarea').TextAreaResizer();");
 }
}

{% endhighlight %}

RichEditor.html
---------------
{% highlight html %}

<html xmlns:wicket>
<wicket:head>
	<style type="text/css">
div.grippie {
	background: #EEEEEE url(img/grippie.png) no-repeat scroll center 2px;
	border-color: #DDDDDD;
	border-style: solid;
	border-width: 0pt 1px 1px;
	cursor: s-resize;
	height: 9px;
	overflow: hidden;
}

.resizable-textarea textarea {
	display: block;
	margin-bottom: 0pt;
	width: 95%;
	height: 20%;
}
</style>
</wicket:head>
<wicket:panel>
	<textarea id="myTextarea" wicket:id="textarea">
  </textarea>
	<script type="text/javascript">
	// to set WMD's options programatically, define a "wmd_options" object with whatever settings
	// you want to override.  Here are the defaults:
	wmd_options = {
		// format sent to the server.  Use "Markdown" to return the markdown source.
		output : "HTML",

		// line wrapping length for lists, blockquotes, etc.
		lineLength : 40,

		// toolbar buttons.  Undo and redo get appended automatically.
		buttons : "bold italic | link blockquote code image | ol ul heading hr",

		// option to automatically add WMD to the first textarea found.  See apiExample.html for usage.
		autostart : true
	};
</script>
	<wicket:link>
		<script type="text/javascript" src="wmd.js"></script>
	</wicket:link>
	<div class="wmd-preview"></div>
</wicket:panel>
</html>
{% endhighlight %}

Resources 
---------
*	[wmd-editor] (http://wmd-editor.com/)
* 	[Text Area Resizer] (http://plugins.jquery.com/project/TextAreaResizer)

Updates
-------
This works fine if there is only on Editor in a Page. If you want to use multiple editor in a single page then you have to use
the reverse engineered version of [Wmd-Editor] (http://github.com/openlibrary/wmd). I am attaching a sample project which uses
multiple editors [Sample-project] (/res/editor.zip). Change it according to your needs.
