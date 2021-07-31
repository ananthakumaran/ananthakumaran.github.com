---
layout: post
title: Remote Emacs Setup
container: emacs-remote
tags: emacs
---

Lately, I have been trying to setup a workflow where the code would
reside on a remote machine and the development would happen from a
macbook pro laptop. Broadly there seems to be two approaches, either
use tramp or use a terminal client over SSH. Even though tramp works
well in most cases, not all the packages support it well and would
need lot of custom config or workaround to play nice with many
packages like flycheck, lsp etc. I have been experimenting with the
terminal client approach and it seems to work well so far. Of course,
there are lot of things that needs to be setup correctly and this post
tries to document some of these items.

### Mosh

[SSH](https://en.wikipedia.org/wiki/Secure_Shell_Protocol) is mostly used to connect to remote shell, but it has some
obvious issues.

1) Each letter you type has to go to the remote machine and come
back. If the round-trip latency is high, it would lead to very bad
typing experience.

2) If there are any network disruptions, the whole shell would hang
and has to be killed and restarted.

[mosh](https://mosh.org/) fixes both of these issues. It has support for local echo,
so you will get immediate feedback and more pleasant typing
experience. It also uses UDP based protocol and can handle network
issues without any issues. [tailscale](https://tailscale.com) can be used if direct SSH to
the machine is not possible due to CGNAT, dynamic IP or any other
reasons.

### 24 bit colors

We need a terminal that supports [true color](https://gist.github.com/XVilka/8346728). I use
[iterm2](https://iterm2.com/). mosh supports true color, but it was not included in the
last released version. It has to be compiled from the [master](https://github.com/mobile-shell/mosh)
branch.  As for Emacs, it comes with true color support in terminal,
but it needs to have a proper [terminfo](https://www.gnu.org/software/emacs/manual/html_node/efaq/Colors-on-a-TTY.html#:~:text=If%20Emacs%20finds%20Terminfo%20capabilities,bit%20colors%20to%20the%20terminal.https://www.gnu.org/software/emacs/manual/html_node/efaq/Colors-on-a-TTY.html)

```bash
# one time setup
cat > /tmp/xterm-24bit.terminfo << EOF
xterm-24bit|xterm with 24-bit direct color mode,
   use=xterm-256color,
   sitm=\E[3m,
   ritm=\E[23m,
   setb24=\E[48;2;%p1%{65536}%/%d;%p1%{256}%/%{255}%&%d;%p1%{255}%&%dm,
   setf24=\E[38;2;%p1%{65536}%/%d;%p1%{256}%/%{255}%&%d;%p1%{255}%&%dm,
EOF
tic -x -o ~/.terminfo /tmp/xterm-24bit.terminfo

# lauch emacs
TERM=xterm-24bit emacs -nw
```

### Keybindings

The steps documented here only applies to iterm2, for other terminals
you might need to refer the respective documentation. Enable [CSI u](https://iterm2.com/documentation-csiu.html) option
under key preference section, this would enable all the Ctrl and Alt
related keybindings ![CSI u](/public/images/iterm-key-1.png)

Super key modifier on emacs can be simulated by first pressing `C-x @ s`
followed by the rest of the keys. For example, to send `s-0`,
add a new keybinding under key preference section and [select vim
special](https://iterm2.com/3.0/documentation-preferences.html) chars as the action and type `\<C-x>@s0` ![Super](/public/images/iterm-key-2.png)

### Clipboard

Clipboard doesn't work by default, but there is a package called
[clipetty](https://github.com/spudlyo/clipetty) which solves the issue. There is a known issue related
to [mosh](mosh), but fortunately it can be easily worked around by
clearing `SSH_TTY` environment variable. It's also recommended to
apply the clipboard related [fixes](https://github.com/mobile-shell/mosh/pull/1104) to mosh.

```elisp
(use-package clipetty
  :ensure t
  :hook (after-init . global-clipetty-mode)
  :init
  (setenv "SSH_TTY"))
```

### Browse URL

Emacs by default will try to open the URL in the remote machine. This
could be easily changed to open in the host machine by customizing the
`browse-url-browser-function`. The example function below gets the
host IP from the environment variable and tries to do a reverse SSH
from the remote to the host. Assuming the public key authentication is
already enabled, this should work. The parameter passed to ssh process
can be tweaked as necessary.

```elisp
(defun browse-url-host (url &optional _new-window)
  (interactive (browse-url-interactive-arg "URL: "))
  (when-let* ((ssh-client (getenv "SSH_CLIENT"))
              (host-ip (car (split-string ssh-client)))
              (host-name (string-trim (shell-command-to-string "whoami"))))
    (call-process "ssh" nil 0 nil
                  (format "%s@%s" host-name host-ip) (format "open '%s'" url))))

(when (getenv "SSH_CLIENT")
  (setq browse-url-browser-function 'browse-url-host))
```
<link rel="stylesheet" href="/public/css/emacs-remote.css"/>
