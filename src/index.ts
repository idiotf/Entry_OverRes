import Tar from 'tar-js'
import generateHash from './hash'
import { deleteProject } from './request'
import { getAudioDuration, getImageSize } from './get-metadata'

const uploadTypes = new WeakMap<XMLHttpRequest, string>()

function open(method: string, url: string | URL): void
function open(method: string, url: string | URL, async: boolean, username?: string | null, password?: string | null): void
function open(this: XMLHttpRequest, method: string, url: string | URL, async?: boolean, username?: string | null, password?: string | null) {
  const match = (url + '').match(/^\/rest\/(picture|sound)\/upload$/)
  if (match?.[1]) uploadTypes.set(this, match[1])

  const bindCallback = originalOpen.bind(this)
  return async == null ? bindCallback(method, url) : bindCallback(method, url, async, username, password)
}

const originalOpen = XMLHttpRequest.prototype.open
XMLHttpRequest.prototype.open = open

async function send(this: XMLHttpRequest, body: FormData) {
  const uploadType = uploadTypes.get(this)
  const files = body instanceof FormData ? getFiles(body) : []
  if (!uploadType || !(body instanceof FormData) || files.some(file => file.type == 'image/svg+xml')) {
    const bindCallback = originalSend.bind(this)
    return bindCallback(body)
  }

  const tar = new Tar
  const items = await Promise.all(uploadType == 'picture'
              ? files.map(file => createPicture(file, generateHash()))
              : files.map(file => createSound(file, generateHash())))

  for (const item of items) tar.append(item.fileurl, new Uint8Array(await item.file))

  tar.append('temp/project.json', encoder.encode(JSON.stringify(project(uploadType, items))))

  const arr = new Uint8Array(tar.out.length)
  arr.set(tar.out)

  body = new FormData
  body.set('projects', new Blob([ arr ]))

  const res = await fetch('/rest/project/upload', {
    method: 'POST',
    body,
  })
  const json = await res.json()
  if (json?._id) deleteProject(json._id)

  const response = JSON.stringify(createResponse(json, items.length, uploadType))

  Object.defineProperties(this, {
    status: { value: 200 },
    readyState: { value: this.DONE },
    responseText: { value: response },
  })

  this.dispatchEvent(new Event('readystatechange'))
}

const originalSend = XMLHttpRequest.prototype.send
XMLHttpRequest.prototype.send = send

const createPicture = async (file: File, filename: string) => (([width, height]) => ({
  id: generateHash(4),
  name: file.name,
  dimension: {
    width,
    height,
  },
  file: file.arrayBuffer(),
  filename,
  fileurl: `temp/${filename.substring(0, 2)}/${filename.substring(2, 4)}/image/${filename}.png`,
  thumbUrl: `/uploads/${filename.substring(0, 2)}/${filename.substring(2, 4)}/image/${filename}.png`,
  imageType: 'png',
}))(await getImageSize(file))

const createSound = async (file: File, filename: string) => ({
  id: generateHash(4),
  name: file.name,
  file: file.arrayBuffer(),
  filename,
  fileurl: `temp/${filename.substring(0, 2)}/${filename.substring(2, 4)}/${filename}.mp3`,
  duration: await getAudioDuration(file).then(v => Math.round(v * 10) / 10),
  ext: '.mp3',
})

function getFiles(body: FormData) {
  const files: File[] = []
  body.forEach((value, key) => {
    if (typeof value == 'string') return
    const index = key.match(/^uploadFile(\d+)$/)?.[1]
    if (!index) return
    files[+index] = value
  })
  return files
}

const encoder = new TextEncoder

interface Picture {
  id: string
  name: string
  dimension: {
    width: number
    height: number
  }
  filename: string
  fileurl: string
  imageType: string
}

interface Sound {
  id: string
  name: string
  filename: string
  fileurl: string
  ext: string
  duration: number
}

function project(type: string, items: Picture[] | Sound[]) {
  return {
    objects: [{
      id: '',
      name: '',
      objectType: 'sprite',
      rotateMethod: 'free',
      scene: '',
      lock: false,
      entity: {
        x: 0,
        y: 0,
        regX: 0,
        regY: 0,
        scaleX: 0,
        scaleY: 0,
        rotation: 0,
        direction: 0,
        width: 0,
        height: 0,
        font: 'undefinedpx ',
        visible: true,
      },
      sprite: {
        pictures: type == 'picture' ? items : [],
        sounds: type == 'sound' ? items : [],
      },
      script: '[]',
    }],
    scenes: [{
      id: '',
      name: '',
    }],
    variables: [],
    messages: [],
    functions: [],
    tables: [],
    speed: 0,
    interface: {
      menuWidth: 0,
      canvasWidth: 0,
      object: '',
    },
    expansionBlocks: [],
    aiUtilizeBlocks: [],
    hardwareLiteBlocks: [],
    externalModules: [],
    externalModulesLite: [],
    isPracticalCourse: false,
    name: 'Entry OverRes 업로드 작품',
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createResponse(json: any, request: number, uploadType: string) {
  const uploads: unknown[] = json.xeyes ? [] : json.objects[0].sprite[uploadType == 'picture' ? 'pictures' : 'sounds']

  return uploadType == 'picture' ? {
    uploads,
    xeye: {
      request,
      success: uploads.length,
    },
  } : uploads
}
