# Third-party notices

Maintainers: AITuberKit does not currently keep a single NOTICE file. This note was added with the optional LivLiv Player renderer. Please move it if another place fits the project better. AITuberKit's own license is unchanged.

## @livliv-dev/player

- Package: `@livliv-dev/player` (version pinned in `package.json`)
- License: Apache License 2.0
- Source: https://github.com/livliv-dev/player
- AITuberKit uses the dependency-free core entry point. The override for Player 0.5.1 keeps AITuberKit's existing `three` and `@pixiv/three-vrm` versions. If the integration starts using Player's `/vrm` entry point, update those dependencies to satisfy the SDK's requirements and remove the override.

Upstream NOTICE, kept here because `node_modules` is not part of this repository:

> LivLiv Player
> Copyright 2026 LivLiv
>
> This product includes software developed by LivLiv (https://livliv.ai).
>
> The featured characters in characters/ are not licensed under the Apache License 2.0. Their own terms are in characters/LICENSE.md and characters/CREDITS.md. Three of them (Kujira, Kujira Q, Pen) come from other people's work.

This repository does not include those featured characters. A user may load a `.livliv` model they have rights to use, including a copy they took from the Player repository, under that separate license. This note does not grant redistribution or commercial use of those characters.

This integration does not load Live2D Cubism files. LivLiv Player does not read `.moc3` files. AITuberKit's existing Live2D renderer is separate and unchanged.
