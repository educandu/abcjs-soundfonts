import gulp from 'gulp';
import path from 'node:path';
import { execa } from 'execa';
import { mkdirp } from 'mkdirp';
import { deleteAsync } from 'del';
import { promises as fs } from 'node:fs';
import { eslint } from '@educandu/dev-tools';

const SALAMANDER_VELOCITY = 5;
const SALAMANDER_BITRATE = '128k';
const SALAMANDER_SOURCE_DIR = 'SalamanderGrandPianoV3_44.1khz16bit/44.1khz16bit';
const SALAMANDER_OUTPUT_DIR = 'FluidR3_Salamander_GM/acoustic_grand_piano-mp3';

export async function clean() {
  await deleteAsync(SALAMANDER_OUTPUT_DIR);
}

export async function lint() {
  await eslint.lint('**/*.js', { failOnError: true });
}

export async function fix() {
  await eslint.fix('**/*.js');
}

export const build = done => done();

export async function buildSalamanderSamples() {
  await mkdirp(path.resolve(SALAMANDER_OUTPUT_DIR));

  const noteMap = {
    /* eslint-disable quote-props, key-spacing, no-multi-spaces */
    'C':  { minOctave: 1, maxOctave: 8, buildFrom: { note: 'C',  octaveOffset:  0, semitoneOffset:  0 } },
    'Db': { minOctave: 1, maxOctave: 8, buildFrom: { note: 'C',  octaveOffset:  0, semitoneOffset: +1 } },
    'D':  { minOctave: 1, maxOctave: 7, buildFrom: { note: 'D#', octaveOffset:  0, semitoneOffset: -1 } },
    'Eb': { minOctave: 1, maxOctave: 7, buildFrom: { note: 'D#', octaveOffset:  0, semitoneOffset:  0 } },
    'E':  { minOctave: 1, maxOctave: 7, buildFrom: { note: 'D#', octaveOffset:  0, semitoneOffset: +1 } },
    'F':  { minOctave: 1, maxOctave: 7, buildFrom: { note: 'F#', octaveOffset:  0, semitoneOffset: -1 } },
    'Gb': { minOctave: 1, maxOctave: 7, buildFrom: { note: 'F#', octaveOffset:  0, semitoneOffset:  0 } },
    'G':  { minOctave: 1, maxOctave: 7, buildFrom: { note: 'F#', octaveOffset:  0, semitoneOffset: +1 } },
    'Ab': { minOctave: 1, maxOctave: 7, buildFrom: { note: 'A',  octaveOffset:  0, semitoneOffset: -1 } },
    'A':  { minOctave: 0, maxOctave: 7, buildFrom: { note: 'A',  octaveOffset:  0, semitoneOffset:  0 } },
    'Bb': { minOctave: 0, maxOctave: 7, buildFrom: { note: 'A',  octaveOffset:  0, semitoneOffset: +1 } },
    'B':  { minOctave: 0, maxOctave: 7, buildFrom: { note: 'C',  octaveOffset: +1, semitoneOffset: -1 } }
    /* eslint-enable quote-props, key-spacing, no-multi-spaces */
  };

  const minOctave = Object.values(noteMap).reduce((accu, item) => Math.min(accu, item.minOctave), Number.MAX_SAFE_INTEGER);
  const maxOctave = Object.values(noteMap).reduce((accu, item) => Math.max(accu, item.maxOctave), Number.MIN_SAFE_INTEGER);

  for (let currentOctave = minOctave; currentOctave <= maxOctave; currentOctave += 1) {
    for (const [note, info] of Object.entries(noteMap)) {
      if (info.minOctave <= currentOctave && info.maxOctave >= currentOctave) {
        const noteToCreate = `${note}${currentOctave}`;
        console.log(`Creating note ${noteToCreate}`);
        const wavSourcePath = path.resolve(SALAMANDER_SOURCE_DIR, `${info.buildFrom.note}${currentOctave + info.buildFrom.octaveOffset}v${SALAMANDER_VELOCITY}.wav`);
        const wavOutputPath = path.resolve(SALAMANDER_OUTPUT_DIR, `${note}${currentOctave}.wav`);
        const mp3OutputPath = path.resolve(SALAMANDER_OUTPUT_DIR, `${note}${currentOctave}.mp3`);
        if (info.buildFrom.semitoneOffset !== 0) {
          console.log(`  * Creating ${wavOutputPath} (soundstretch)`);
          await execa('soundstretch', [wavSourcePath, wavOutputPath, `-pitch=${info.buildFrom.semitoneOffset}`]);
        } else {
          console.log(`  * Creating ${wavOutputPath} (copy)`);
          await fs.copyFile(wavSourcePath, wavOutputPath);
        }
        console.log(`  * Creating ${mp3OutputPath}`);
        await execa('ffmpeg', ['-i', wavOutputPath, '-b:a', SALAMANDER_BITRATE, mp3OutputPath]);
        console.log(`  * Deleting ${wavOutputPath}`);
        await fs.unlink(wavOutputPath);
      }
    }
  }
}

export const verify = gulp.series(lint, build);

export default verify;
