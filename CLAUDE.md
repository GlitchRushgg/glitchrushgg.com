# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo

`glitchrush.gg` is a collection of independent, mobile-first HTML5 browser games plus the GlitchRushGG studio landing page (`index.html` at root). Each game lives in its own top-level folder, is self-contained (no shared build system or dependencies between games), and is deployed under its own path on GitHub Pages with the custom domain `glitchrushgg.com` (see `CNAME`).

When working on a specific game, read that game's own `CLAUDE.md` for its architecture and run instructions.

## Games

- **[noah/](noah/)** — *"Don't Drown, Noah!"* A Phaser 3 vertical platformer: jump up procedurally-generated platforms to reach the Ark before a rising flood catches you. See [noah/CLAUDE.md](noah/CLAUDE.md).

## Other top-level content

- `index.html` — studio landing page (email capture via MailerLite, embedded game, public roadmap). Setup steps in `SETUP.md`.
- `brand/` — brand kit: avatar/logo/banner SVGs, PNG exporter (`export.html`), brand guide (`BRAND.md`).

## Conventions for adding a new game

- Create a new top-level folder for the game (lowercase name — GitHub Pages URLs are case-sensitive); keep it self-contained.
- Add its own `CLAUDE.md` documenting how to run it and its architecture.
- Add an entry to the **Games** list above and a card on the landing page.
- These are static sites (no build step) served as ES modules — they must be served over HTTP, not opened from `file://`. Deployment is GitHub Pages from the repo root (`.nojekyll` present in game folders).

## Environment note

Git is installed **per-user** at `C:\Users\Rosselyn\AppData\Local\Programs\Git\cmd` — if `git` isn't found in a shell, append that to `$env:Path` first. Remote: `https://github.com/GlitchRushgg/glitchrushgg.com` (branch `main`). GitHub Pages serves this repo at `https://glitchrushgg.com` (CNAME at root); pushing to `main` deploys the live site.
