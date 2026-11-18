# Third-party notices

Maintainers: AITuberKit does not currently keep a single NOTICE file. This note was added with the optional LivLiv Player renderer. Please move it if another place fits the project better. AITuberKit's own license is unchanged.

## @livliv-dev/player

- Package: `@livliv-dev/player` (version pinned in `package.json`)
- License: Apache License 2.0
- Source: https://github.com/livliv-dev/player
- The core package has no runtime dependencies. Its optional peers (`three` >= 0.170, `@pixiv/three-vrm`, `@mediapipe/tasks-vision`) belong to other entry points (`/vrm`, `/tracking`). This integration imports only `@livliv-dev/player` and does not use those entry points, so the app's existing `three` 0.167 is left as it is.
- `npm ci` installs the committed lockfile. A fresh `npm install` (which re-resolves peers) stops on that optional `three` range. `--legacy-peer-deps` lets the install finish, and it also drops peer packages this repository previously locked (notably `webpack`, a peer of `style-loader` / `terser-webpack-plugin`). That flag was not committed, so the lockfile stays the previous tree plus this package. Maintainers can decide whether a project `.npmrc` is appropriate.

Upstream NOTICE, kept here because `node_modules` is not part of this repository:

> LivLiv Player
> Copyright 2026 LivLiv
>
> This product includes software developed by LivLiv (https://livliv.ai).
>
> The featured characters in characters/ are not licensed under the Apache License 2.0. Their own terms are in characters/LICENSE.md and characters/CREDITS.md. Three of them (Kujira, Kujira Q, Pen) come from other people's work.

This repository does not include those featured characters. A user may load a `.livliv` model they have rights to use, including a copy they took from the Player repository, under that separate license. This note does not grant redistribution or commercial use of those characters.

This integration does not load Live2D Cubism files. LivLiv Player does not read `.moc3` files. AITuberKit's existing Live2D renderer is separate and unchanged.
