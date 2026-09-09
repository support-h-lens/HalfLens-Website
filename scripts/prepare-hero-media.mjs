import { createHash } from 'node:crypto'
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

// Creates web derivatives; the supplied originals are only read.
const inputDirectory = resolve(process.argv[2] || '.')
const root = resolve(import.meta.dirname, '..')
const staging = join(root, 'artifacts', 'hero-media-preparation', 'fastdecode')
const destination = join(root, 'public', 'media')
mkdirSync(staging, { recursive: true })
mkdirSync(destination, { recursive: true })
const digest = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
const probe = (file) => JSON.parse(execFileSync('ffprobe', [
  '-v', 'error', '-show_streams', '-show_format', '-of', 'json', file,
], { encoding: 'utf8' }))
const sources = readdirSync(inputDirectory)
  .filter((name) => /\.mp4$/i.test(name))
  .map((name) => {
    const path = join(inputDirectory, name)
    const metadata = probe(path)
    const video = metadata.streams.find((stream) => stream.codec_type === 'video')
    return { path, metadata, video, orientation: video.width > video.height ? 'landscape' : 'portrait' }
  })
if (sources.length !== 2 || new Set(sources.map((source) => source.orientation)).size !== 2) {
  throw new Error('Expected one landscape MP4 and one portrait MP4.')
}
const manifest = []
for (const source of sources) {
  if (source.video.avg_frame_rate !== '48/1') throw new Error('This profile requires 48 FPS input.')
  const encoded = join(staging, `${source.orientation}.mp4`)
  const scale = source.orientation === 'portrait' ? '720:1280' : '1920:1080'
  execFileSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'warning', '-n', '-i', source.path,
    '-map', '0:v:0', '-an', '-sn', '-dn', '-map_metadata', '-1',
    '-vf', `scale=${scale}:flags=lanczos,setsar=1`, '-c:v', 'libx264',
    '-preset', 'slow', '-tune', 'fastdecode', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-g', '6', '-keyint_min', '6', '-sc_threshold', '0', '-bf', '0',
    '-r', '48', '-fps_mode', 'cfr', '-movflags', '+faststart', encoded,
  ], { stdio: 'inherit' })
  const output = probe(encoded)
  const stream = output.streams.find((entry) => entry.codec_type === 'video')
  const keyframes = JSON.parse(execFileSync('ffprobe', [
    '-v', 'error', '-skip_frame', 'nokey', '-select_streams', 'v:0',
    '-show_entries', 'frame=best_effort_timestamp_time', '-of', 'json', encoded,
  ], { encoding: 'utf8' })).frames.map((frame) => Number(frame.best_effort_timestamp_time))
  const gaps = keyframes.slice(1).map((time, i) => time - keyframes[i])
  const bytes = readFileSync(encoded)
  const atoms = []
  for (let offset = 0; offset + 8 <= bytes.length;) {
    let size = bytes.readUInt32BE(offset)
    const type = bytes.toString('ascii', offset + 4, offset + 8)
    if (size === 1) size = Number(bytes.readBigUInt64BE(offset + 8))
    atoms.push(type)
    if (size === 0) break
    offset += size
  }
  if (stream.nb_frames !== source.video.nb_frames || stream.has_b_frames !== 0
    || Math.max(...gaps) > 0.126 || atoms.indexOf('moov') > atoms.indexOf('mdat')) {
    throw new Error(`Scrubbing encode validation failed: ${source.orientation}`)
  }
  const videoName = `h-lens-hero-${source.orientation}.${digest(encoded).slice(0, 12)}.mp4`
  copyFileSync(encoded, join(destination, videoName))
  const poster = join(staging, `${source.orientation}.webp`)
  execFileSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'warning', '-n', '-i', encoded,
    '-vf', 'select=eq(n\\,2)', '-frames:v', '1', '-c:v', 'libwebp', '-quality', '85', poster,
  ], { stdio: 'inherit' })
  const posterName = `h-lens-hero-${source.orientation}-poster.${digest(poster).slice(0, 12)}.webp`
  copyFileSync(poster, join(destination, posterName))
  const entry = {
    orientation: source.orientation, original: basename(source.path), originalSha256: digest(source.path),
    originalBytes: Number(source.metadata.format.size), video: videoName, poster: posterName,
    width: stream.width, height: stream.height, frameRate: stream.avg_frame_rate,
    frames: Number(stream.nb_frames), duration: Number(stream.duration), bytes: bytes.length,
    keyframes: keyframes.length, maxKeyframeGapSeconds: Math.max(...gaps), bFrames: stream.has_b_frames,
    fastStart: atoms.indexOf('moov') < atoms.indexOf('mdat'), audio: false,
    contentType: 'video/mp4', cacheControl: 'public, max-age=31536000, immutable',
  }
  manifest.push(entry)
  console.log(JSON.stringify(entry))
}
writeFileSync(join(staging, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
