import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const profile = join(tmpdir(), `hl-v2-capture-${Date.now()}`)
mkdirSync(profile, { recursive: true })

const browser = spawn(chrome, [
  '--headless=new',
  '--hide-scrollbars',
  '--no-first-run',
  '--disable-background-networking',
  '--remote-debugging-port=0',
  `--user-data-dir=${profile}`,
  'about:blank',
], { stdio: 'ignore' })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitForPort() {
  const portFile = join(profile, 'DevToolsActivePort')
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (existsSync(portFile)) return readFileSync(portFile, 'utf8').split(/\r?\n/)[0]
    await sleep(100)
  }
  throw new Error('Chrome DevTools port was not created')
}

async function waitForTarget(port) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const targets = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json())
    const target = targets.find((item) => item.type === 'page')
    if (target) return target
    await sleep(100)
  }
  throw new Error('Chrome page target was not created')
}

function createSession(url) {
  const socket = new WebSocket(url)
  let nextId = 1
  const pending = new Map()
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data)
    if (!message.id || !pending.has(message.id)) return
    const { resolve, reject } = pending.get(message.id)
    pending.delete(message.id)
    if (message.error) reject(new Error(message.error.message))
    else resolve(message.result)
  }
  const ready = new Promise((resolve, reject) => {
    socket.onopen = resolve
    socket.onerror = reject
  })
  return {
    ready,
    close: () => socket.close(),
    send(method, params = {}) {
      const id = nextId
      nextId += 1
      socket.send(JSON.stringify({ id, method, params }))
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
    },
  }
}

const outputDirectory = new URL('.', import.meta.url)
const pageUrl = 'http://127.0.0.1:5174/'

const captures = [
  { name: '1920-hero', width: 1920, height: 1080 },
  { name: '1440-hero', width: 1440, height: 900 },
  { name: '1440-story', width: 1440, height: 900, selector: '#story', progress: 0.24 },
  { name: '1440-services-intro', width: 1440, height: 900, selector: '#services', progress: 0.02 },
  { name: '1440-service-01', width: 1440, height: 900, selector: '.service-item:nth-child(1)', progress: 0.32 },
  { name: '1440-services-02-03', width: 1440, height: 900, selector: '.service-item:nth-child(3)', progress: 0.08 },
  { name: '1440-work', width: 1440, height: 900, selector: '#portfolio', progress: 0.08 },
  { name: '1440-clients', width: 1440, height: 900, selector: '#clients', progress: 0.06 },
  { name: '1440-contact', width: 1440, height: 900, selector: '#contact', progress: 0.12 },
  { name: '768-hero', width: 768, height: 1024, mobile: true },
  { name: '768-services', width: 768, height: 1024, mobile: true, selector: '#services', progress: 0.03 },
  { name: '768-contact', width: 768, height: 1024, mobile: true, selector: '#contact', progress: 0.08 },
  { name: '390-hero', width: 390, height: 844, mobile: true },
  { name: '390-services', width: 390, height: 844, mobile: true, selector: '#services', progress: 0.03 },
  { name: '390-service-01', width: 390, height: 844, mobile: true, selector: '.service-item:nth-child(1)', progress: 0.28 },
  { name: '390-contact', width: 390, height: 844, mobile: true, selector: '#contact', progress: 0.08 },
]

try {
  const port = await waitForPort()
  const target = await waitForTarget(port)
  const session = createSession(target.webSocketDebuggerUrl)
  await session.ready
  await session.send('Page.enable')
  await session.send('Runtime.enable')

  for (const capture of captures) {
    await session.send('Emulation.setDeviceMetricsOverride', {
      width: capture.width,
      height: capture.height,
      deviceScaleFactor: 1,
      mobile: Boolean(capture.mobile),
      screenWidth: capture.width,
      screenHeight: capture.height,
    })
    await session.send('Page.navigate', { url: pageUrl })
    await sleep(3600)
    await session.send('Runtime.evaluate', {
      expression: `(() => {
        document.documentElement.style.scrollBehavior = 'auto';
        const selector = ${JSON.stringify(capture.selector ?? null)};
        if (!selector) { window.scrollTo(0, 0); return; }
        const element = document.querySelector(selector);
        if (!element) throw new Error('Missing capture selector: ' + selector);
        const progress = ${capture.progress ?? 0};
        const y = window.scrollY + element.getBoundingClientRect().top + element.getBoundingClientRect().height * progress;
        window.scrollTo(0, Math.max(0, y));
      })()`,
    })
    await sleep(1300)
    const screenshot = await session.send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: false,
    })
    writeFileSync(new URL(`${capture.name}.png`, outputDirectory), Buffer.from(screenshot.data, 'base64'))
  }
  session.close()
} finally {
  browser.kill()
}
