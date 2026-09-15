// Gera os icones PNG do app a partir da mesma marca do public/icone.svg.
// Desenha por conta em vez de rasterizar SVG, para nao depender de nenhuma
// biblioteca de imagem. Rodar com: node scripts/gerar-icones.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')

// ============ cores da marca ============
const PARADAS = [
  { t: 0, cor: [11, 138, 92] }, // #0b8a5c
  { t: 0.45, cor: [23, 181, 131] }, // #17b583
  { t: 1, cor: [58, 214, 164] }, // #3ad6a4
]

function corDoGradiente(t) {
  for (let i = 1; i < PARADAS.length; i++) {
    const a = PARADAS[i - 1]
    const b = PARADAS[i]
    if (t <= b.t) {
      const p = (t - a.t) / (b.t - a.t)
      return [0, 1, 2].map((c) => Math.round(a.cor[c] + (b.cor[c] - a.cor[c]) * p))
    }
  }
  return PARADAS[PARADAS.length - 1].cor
}

// ============ geometria ============
const distanciaAoSegmento = (px, py, ax, ay, bx, by) => {
  const vx = bx - ax
  const vy = by - ay
  const wx = px - ax
  const wy = py - ay
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy)))
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t))
}

/** Distância assinada até a borda de um retângulo arredondado. */
const distanciaAoRetangulo = (px, py, cx, cy, mx, my, r) => {
  const qx = Math.abs(px - cx) - (mx - r)
  const qy = Math.abs(py - cy) - (my - r)
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
}

// A marca vem do viewBox 0 0 48 48 do icone.svg, deslocada e escalada.
const TRACOS = [
  [13, 32, 21, 21],
  [21, 21, 25.5, 26.5],
  [25.5, 26.5, 35, 14],
  [28.5, 14, 35, 14],
  [35, 14, 35, 20.5],
]

function desenhar(tamanho, margem) {
  const pixels = Buffer.alloc(tamanho * tamanho * 4)
  const raioFundo = tamanho * 0.21875 // 112/512, o mesmo do SVG
  const escala = (tamanho * (1 - margem * 2)) / 48
  const deslocamento = tamanho * margem
  const emUnidades = (v) => deslocamento + v * escala
  const larguraTraco = 3.6 * escala * 0.5

  for (let y = 0; y < tamanho; y++) {
    for (let x = 0; x < tamanho; x++) {
      const i = (y * tamanho + x) * 4
      const cx = x + 0.5
      const cy = y + 0.5

      // Fundo: gradiente na diagonal, recortado pelo retangulo arredondado.
      const dFundo = distanciaAoRetangulo(cx, cy, tamanho / 2, tamanho / 2, tamanho / 2, tamanho / 2, raioFundo)
      const alfaFundo = Math.max(0, Math.min(1, 0.5 - dFundo))
      const [r, g, b] = corDoGradiente(Math.max(0, Math.min(1, (cx + cy) / (tamanho * 2))))

      pixels[i] = r
      pixels[i + 1] = g
      pixels[i + 2] = b
      pixels[i + 3] = Math.round(alfaFundo * 255)

      if (alfaFundo <= 0) continue

      // Marca branca: contorno quadrado mais a seta de tendencia.
      let dMarca = Math.abs(
        distanciaAoRetangulo(cx, cy, emUnidades(24), emUnidades(24), 20 * escala, 20 * escala, 11 * escala),
      )
      for (const [ax, ay, bx, by] of TRACOS) {
        dMarca = Math.min(
          dMarca,
          distanciaAoSegmento(cx, cy, emUnidades(ax), emUnidades(ay), emUnidades(bx), emUnidades(by)),
        )
      }

      const alfaMarca = Math.max(0, Math.min(1, larguraTraco - dMarca + 0.5)) * alfaFundo
      if (alfaMarca > 0) {
        pixels[i] = Math.round(pixels[i] * (1 - alfaMarca) + 255 * alfaMarca)
        pixels[i + 1] = Math.round(pixels[i + 1] * (1 - alfaMarca) + 255 * alfaMarca)
        pixels[i + 2] = Math.round(pixels[i + 2] * (1 - alfaMarca) + 255 * alfaMarca)
      }
    }
  }
  return pixels
}

// ============ PNG na mao ============
const crcTabela = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (const byte of buf) c = crcTabela[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function bloco(tipo, dados) {
  const nome = Buffer.from(tipo, 'ascii')
  const tamanho = Buffer.alloc(4)
  tamanho.writeUInt32BE(dados.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([nome, dados])))
  return Buffer.concat([tamanho, nome, dados, crc])
}

function paraPng(pixels, tamanho) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(tamanho, 0)
  ihdr.writeUInt32BE(tamanho, 4)
  ihdr[8] = 8 // bits por canal
  ihdr[9] = 6 // RGBA
  // Uma linha de filtro zero na frente de cada scanline.
  const bruto = Buffer.alloc(tamanho * (tamanho * 4 + 1))
  for (let y = 0; y < tamanho; y++) {
    bruto[y * (tamanho * 4 + 1)] = 0
    pixels.copy(bruto, y * (tamanho * 4 + 1) + 1, y * tamanho * 4, (y + 1) * tamanho * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', ihdr),
    bloco('IDAT', deflateSync(bruto, { level: 9 })),
    bloco('IEND', Buffer.alloc(0)),
  ])
}

const icones = [
  { arquivo: 'public/icone-192.png', tamanho: 192, margem: 0.14 },
  { arquivo: 'public/icone-512.png', tamanho: 512, margem: 0.14 },
  // Maskable precisa de area segura: a marca ocupa so o miolo.
  { arquivo: 'public/icone-maskable-512.png', tamanho: 512, margem: 0.22 },
  { arquivo: 'public/apple-touch-icon.png', tamanho: 180, margem: 0.14 },
]

mkdirSync(join(raiz, 'public'), { recursive: true })
for (const { arquivo, tamanho, margem } of icones) {
  const png = paraPng(desenhar(tamanho, margem), tamanho)
  writeFileSync(join(raiz, arquivo), png)
  console.log(`${arquivo} · ${tamanho}px · ${(png.length / 1024).toFixed(1)} kB`)
}
