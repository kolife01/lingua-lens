# Narration replacement

`narration-01.m4a` through `narration-06.m4a` match the v1 scene order:

1. `cold-open`
2. `problem`
3. `reveal`
4. `core-demo`
5. `build`
6. `close`

To replace the TTS with a personal recording:

1. Re-record each scene into the matching filename in this folder.
2. Keep AAC/M4A format if possible. If you record WAV or AIFF, convert it:
   `afconvert -f m4af -d aac input.wav output.m4a`
3. Sync the render copy used by Remotion:
   `cp video/audio/narration-*.m4a video/public/audio/`
4. Re-render:
   `cd video && npx remotion render src/index.ts LinguaLensDraft out/draft-v1.mp4`

The on-screen subtitles are generated from `video/NARRATION-v1.md`, so if the spoken wording changes, update `video/src/script.ts` to match.
