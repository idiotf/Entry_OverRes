export async function getAudioDuration(file: File) {
  const src = URL.createObjectURL(file)
  const audio = new Audio(src)
  try {
    return await new Promise<number>((resolve, reject) => {
      audio.addEventListener('loadedmetadata', () => resolve(audio.duration))
      audio.addEventListener('error', reject)
    })
  } finally {
    URL.revokeObjectURL(src)
  }
}

export async function getImageSize(file: File) {
  const src = URL.createObjectURL(file)
  const image = new Image
  image.src = src
  try {
    return await new Promise<[number, number]>((resolve, reject) => {
      image.addEventListener('load', () => resolve([image.width, image.height]))
      image.addEventListener('error', reject)
    })
  } finally {
    URL.revokeObjectURL(src)
  }
}
