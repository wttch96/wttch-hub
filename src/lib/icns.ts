// Minimal ICNS packer: downscales a 1024×1024 master canvas to the standard
// sizes and packs them as PNG-compressed ICNS chunks. Pure browser JS, no deps.

const ICNS_SIZES: [string, number][] = [
  ['icp4', 16],
  ['icp5', 32],
  ['icp6', 64],
  ['ic07', 128],
  ['ic08', 256],
  ['ic09', 512],
  ['ic10', 1024],
]

export interface IcnsChunk {
  type: string
  data: Uint8Array
}

function pngFromCanvas(size: number, master: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const c = document.createElement('canvas')
    c.width = size
    c.height = size
    const ctx = c.getContext('2d')
    if (!ctx) return reject(new Error('canvas 2d 不可用'))
    ctx.drawImage(master, 0, 0, size, size)
    c.toBlob((blob) => {
      if (!blob) return reject(new Error('PNG 编码失败'))
      blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)))
    }, 'image/png')
  })
}

function chunkBytes(chunk: IcnsChunk): Uint8Array {
  const { type, data } = chunk
  const length = 8 + data.length
  const out = new Uint8Array(length)
  const view = new DataView(out.buffer)
  for (let i = 0; i < 4; i++) out[i] = type.charCodeAt(i)
  view.setUint32(4, length, false)
  out.set(data, 8)
  return out
}

/**
 * Pack a 1024×1024 canvas into an ICNS binary blob.
 */
export async function packIcns(master: HTMLCanvasElement): Promise<Blob> {
  const chunks = await Promise.all(
    ICNS_SIZES.map(async ([type, size]) => ({
      type,
      data: await pngFromCanvas(size, master),
    }))
  )

  const totalSize = 8 + chunks.reduce((sum, c) => sum + 8 + c.data.length, 0)
  const out = new Uint8Array(totalSize)
  const view = new DataView(out.buffer)
  // magic 'icns'
  out[0] = 0x69 // i
  out[1] = 0x63 // c
  out[2] = 0x6e // n
  out[3] = 0x73 // s
  view.setUint32(4, totalSize, false)

  let offset = 8
  for (const chunk of chunks) {
    const bytes = chunkBytes(chunk)
    out.set(bytes, offset)
    offset += bytes.length
  }

  return new Blob([out.buffer], { type: 'application/octet-stream' })
}

/** Trigger a browser download of a blob with a given filename. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
