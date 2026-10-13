# Dynamic music pack — 2.0.0

Load this optional pack alongside Deadwood Reblooms 2.0.0 and maplebirch 5.4.3. Turn on dynamic music in the game settings. Music and ambience have separate enable switches and volume sliders; the framework master volume and mute affect both layers.

The pack provides 16 instrumental music tracks and 11 environment loops. Outdoor rain, snow, birds and traffic do not play indoors. Casino and pub chatter, factory machinery, underground air and cabin fires have their own location rules. Full source and processing details are in [audio/CREDITS.md](audio/CREDITS.md).

## Configuration

`dynamic-music.json` uses version 2:

- `scenes`: ordered scene classifiers, each with a `scene` ID and `when`.
- `music` and `ambience`: independently selected layers. Each entry has a unique `track` ID, a packaged `file` under `audio/`, a finite `priority` and `when`.
- Music can provide `title` and `artist` for the player library.
- Highest matching priority wins. A condition with an array accepts any listed value; different conditions must all match.
- A string ending in `*` matches a prefix. Other strings match exactly. No regular expressions or executable code are accepted.
- `{}` always matches and is useful for music fallback; a missing ambience match is silence.

Available conditions: `scene`, `action`, `location`, `passage`, `bus`, `outside`, `combat`, `consensual`, `lightning`, `solarEclipse`, `bloodMoon`, `meteorShower`, `weather`, `precipitation`, `dayState`, `season`. Scene classifiers cannot test `scene` themselves. Locations are lowercase; passage titles keep their original spelling. `action` is `none`, `heist` or `pursuit`, scoped to the corresponding active passage. `outside`, `consensual`, `lightning` and celestial flags are booleans; `combat` is a number.

Weather ambience overrides local outdoor sounds. Combat and active crime sequences take precedence over location music. A consensual encounter uses a quieter piece than danger combat. Visiting another passage with the same selected track does not restart playback.

The main mod reads the configuration from this pack. The packager validates every referenced audio file before creating a ZIP. Music uses the framework playlist and per-mod volume; ambience uses the framework's separate loop channel and fades between environments. The two channels do not write playback position to a game save.

## Credits and verification

All material is CC0. [audio/assets.json](audio/assets.json) contains per-file hashes and actual durations. Re-encoded assets preserve musical structure; ambience stays compact and loops without padding silence. The sources and their release licences are linked in [audio/CREDITS.md](audio/CREDITS.md).
