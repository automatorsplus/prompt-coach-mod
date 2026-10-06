# Prompt Coach Mod for Claude Code

> Part of the **Automators+** library -- Claude Code skills and mods shared exclusively with the Automators+ community.

`/coach` scores a prompt before you send it and hands you a better version.

## What You Get

- **Three scores out of 10** -- goal (is it clear what you want), context (does Claude have what it needs) and done (will Claude know when it's finished)
- **Two or three notes** on what to fix
- **A rewrite** that keeps your wording where it works, with square-bracket placeholders where something's missing instead of made-up facts
- **Send improved, Edit improved or Send mine** -- one press each
- **`/coach` on its own** coaches the last prompt you sent

## Requirements

- Claude Code v2.1.287 or later in the terminal, or the Code tab of the Claude Desktop app on v2.1.286 or later. Enter `/status` to check your version
- Mods draw in the terminal and the Desktop app. The VS Code extension's chat panel runs them but doesn't show them

## Install

In your terminal:

```
claude plugin marketplace add automatorsplus/prompt-coach-mod
claude plugin install prompt-coach@prompt-coach-mod
```

Or from inside a Claude Code session, in one line:

```
/plugin install prompt-coach --marketplace automatorsplus/prompt-coach-mod
```

Then start a new session, or run `/reload-plugins`. To turn it off later, open `/plugin`, go to the **Installed** tab and disable it.

## Try It

Give it a lazy prompt on purpose:

```
/coach make my website better
```

The coach opens in a pane beside the chat. Press **Edit improved** to fill in the placeholders before you send it.

## How It Works

`hooks/register.tsx` sends your prompt to Sonnet 5.5 through your Claude Code account with a short scoring brief, and
draws the scores, notes and rewrite in a pane.

---

*Shared with the Automators+ community*
