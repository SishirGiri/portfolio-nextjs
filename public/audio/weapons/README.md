# weapons/

Neon Drive has no weapons — pursuits are ram/escape only. This folder
exists to keep the audio tree aligned with the shared structure.

If weapons are ever added:

1. drop `shot.*`, `reload.*`, `hit.*` … here
2. add manifest entries in `src/audio/manifest.js` with the `sfx`
   channel and positional `ref`/`max` radii
3. call `audio.mgr.playAt('weapons.shot', x, z)` from the gameplay
   system that fires them
