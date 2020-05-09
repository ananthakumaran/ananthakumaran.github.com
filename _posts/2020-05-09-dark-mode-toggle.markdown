---
layout: post
title: Dark Mode Toggle
---

I switch a lot between dark and light themes based on the
ambiance. The addition of dark mode in macOS helped a lot. But to toggle
the theme, one still has to do a lot of clicks. So I decided to spend
some time and automate the whole process. Now with a single command, I
can switch the theme of all the applications I care about.

![](/public/images/theme-toggle.gif)

## System Dark Mode

The most important one is the OS Dark Mode. Most of the applications
automatically switch themes based on the Dark Mode. The Applescript
code below enables Dark Mode, to disable Dark Mode use `set dark mode
to false`.

```applescript
tell application "System Events"
    tell appearance preferences
        set dark mode to true
    end tell
end tell
```

## Terminal

The terminal app comes with its own theme preference. The following AppleScript
switches the theme across all windows and tabs within.

```applescript
tell application "Terminal"
    repeat with w from 1 to count windows
        repeat with t from 1 to count tabs of window w
            set current settings of tab t of window w to (first settings set whose name is "Solarized_Dark")
        end repeat
    end repeat
end tell
```

## Tmux

I use the [powerline](https://github.com/powerline/powerline) plugin
to manage the [tmux](https://github.com/tmux/tmux) status line theme
and content. Overwriting the powerline config and reloading the tmux
conf would switch the theme.

```sh
cp ~/.config/powerline/colorschemes/tmux/solarized-dark.json ~/.config/powerline/colorschemes/tmux/solarized.json
tmux source-file ~/.tmux.conf
```

## Emacs

[Emacs](https://www.gnu.org/software/emacs/) has a client-server model
builtin. The GUI will act as a server that can be controlled by
clients from the command line. To enable the server, call
`(server-start)` on initialization.

```sh
function emacs-running() {
    if pgrep Emacs > /dev/null
    then
        return 0
    else
        return 1
    fi
}

if emacs-running
then
    emacsclient --eval "(load-theme 'solarized-dark)" > /dev/null
fi
```
