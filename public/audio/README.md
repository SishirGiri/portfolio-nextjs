# Neon Drive — Audio Assets

All sounds for the Neon Drive NYC demo live here and are mapped to game
events in `public/demos/car-game/src/audio/manifest.js`.

## ⚠ Licensing status

**Every file in this tree is a procedurally generated PLACEHOLDER**,
rendered offline by `public/demos/car-game/tools/generate-audio.mjs`
(WAV/OGG/MP3 encoders, no third-party samples). They are safe to ship
with the portfolio, but they are synthesis, not field recordings.

To upgrade to truly *recorded* sound, replace files **1:1** (same name,
same format) from a royalty-free source and nothing else needs to change
— the runtime, manifest, mixer channels, spatialization and settings
all stay as they are. Good sources:

| Need | Suggested libraries |
| --- | --- |
| Engine loops (per-RPM layers) | Sonniss GDC bundles, ZapSplat, Freesound (CC0), Epic/Unreal engine asset packs |
| Tire squeal / skid | Freesound CC0 "tire skid", Sonniss |
| Crashes / metal / glass | freesound.org CC0 impact packs |
| City ambience / rain / wind | BBC Sound Effects (personal/edu), freesound CC0 field recordings |
| Horns / sirens | US federal siren recordings (public domain), freesound CC0 |
| UI / stings / music | Any CC0 synth SFX; current music is original synthesis and can stay |

## Format policy

- `.wav` — sounds that must loop **sample-seamlessly** (engine RPM
  layers, siren wail, city beds, tire loops, scrape). No codec padding.
- `.ogg` (Opus/Vorbis) — compressed default for one-shots & noise loops.
- `.mp3` — Safari fallback; the runtime picks via `canPlayType`
  (`AudioManager.resolveExt`).

## Tree → game events

```
audio/
├── engines/          dynamic engine system (src/audio/EngineAudio.js)
│   ├── sport_idle|low|mid|high.wav   RPM crossfade layers (supercars)
│   ├── std_idle|low|mid|high.wav     RPM crossfade layers (commuters)
│   ├── start.*                       ignition: door→starter→catch
│   ├── stop.*                        shutdown shudder
│   ├── blowoff.*                     turbo blow-off (throttle lift)
│   └── backfire_1|2.*                exhaust crackle (lift-off / damage)
├── vehicles/
│   ├── horn.*                        player horn (latched)
│   ├── horn_ai_car|truck.*           AI traffic horns (positional)
│   ├── siren_wail.wav                police pursuit loop (positional, follows car)
│   ├── siren_burst.*                 pursuit-start whoop
│   ├── door.*                        enter/exit vehicle
│   └── buzzer.*                      busted sting layer
├── tires/
│   ├── skid_loop.*                   locked-wheel / braking squeal
│   ├── drift_loop.*                  sideways drift scrub
│   ├── screech_onset.*               grip-break chirp
│   └── road_loop.*                   speed-scaled road rumble
├── collisions/
│   ├── crash_light|medium|heavy.*    impacts by severity (positional)
│   ├── glass.*                       glass break on heavy damage
│   ├── scrape_loop.*                 wall grinding
│   └── thud.*                        hard landings (ramps)
├── environment/
│   ├── rain_loop.*                   weather intensity
│   ├── wind_loop.*                   speed-scaled wind
│   ├── city_day_loop.wav             daytime traffic bed
│   ├── city_night_loop.wav           night bed + crickets
│   ├── thunder_1|2|3.*               storm strikes (random pick)
│   ├── splash.*                      puddles at speed in rain
│   └── traffic_pass.*                fly-by whoosh (positional + Doppler)
├── ui/
│   ├── click/hover/back/slider.*     buttons, hovers, faders
│   ├── toggle_on/off.*               checkbox feedback
│   ├── deny.*                        destructive/locked action
│   └── menu_transition.*             overlay open swoosh
├── missions/
│   ├── mission_start.*               mission / roam-event kickoff
│   ├── countdown.* / countdown_go.*  3-2-1 beeps (reserved for races)
│   ├── checkpoint.*                  checkpoint / roam start chime
│   ├── mission_complete.*            results jingle
│   ├── mission_fail.*                game-over sting
│   ├── level_up.*                    player level-up
│   └── busted.*                      police bust sting
├── economy/
│   ├── coin.*                        mission payouts / tips
│   ├── purchase.*                    vehicle purchase (cha-ching)
│   ├── upgrade.*                     garage upgrade install
│   └── refuel.*                      gas-station glug
├── music/
│   ├── menu_loop.*                   menu synthwave (mellow)
│   └── game_loop.*                   driving synthwave (crossfades)
└── weapons/          empty — Neon Drive has no weapons (see below)
```

## Regenerating

```bash
npm i -D wasm-media-encoders   # already a devDependency
node public/demos/car-game/tools/generate-audio.mjs
```

The generator is deterministic (seeded). Tweak the DSP in that script
and re-run; the manifest references files by name only.
