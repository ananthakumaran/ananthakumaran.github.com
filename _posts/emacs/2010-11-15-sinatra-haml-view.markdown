---
layout: post
title: Emacs Tips
header: Emacs Tips
meta_keywords: Emacs Tips
meta_descripton: Emacs Tips
---

{% highlight cl %}

;; usage
;;
;; (add-hook 'ruby-mode-hook
;;          (lambda ()
;;	    (local-set-key (kbd "C-x j") 'jump-to-view)))
;;
;; keep the point anywhere inside a sinatra route and
;; press C-x j to open the haml file

(require 'thingatpt)
(defun jump-to-view ()
  "jumps to haml view"
  (interactive)
  (let ((sentence (thing-at-point 'sentence)))
    (if (string-match ".*haml(?[[:blank:]]*:\\(?:'\\|\"\\)?\\([^\"\', \f\t\n\r\v]+\\).*" sentence)
	(let ((file (match-string-no-properties 1 sentence)))
	  (if (one-window-p)
	      (split-window-vertically))
	  (select-window (next-window))
	  (find-file (concat (project-root) (concat "app/views/" (concat file ".haml"))))))))

{% endhighlight %}
