import { SocialNetworkUI, getActivatedUI } from '../../../social-network/ui'
import { untilDocumentReady } from '../../../utils/dom'
import { getUrl, downloadUrl, pasteImageToActiveElements } from '../../../utils/utils'
import Services from '../../../extension/service'
import { decodeArrayBuffer } from '../../../utils/type-transform/String-ArrayBuffer'
import { GrayscaleAlgorithm } from '@dimensiondev/stego-js/cjs/grayscale'
import type Jimp from '@jimp/core/types'

export async function uploadToPostBoxFacebook(
    text: string,
    options: Parameters<SocialNetworkUI['taskUploadToPostBox']>[1],
) {
    const { warningText, template = 'v2' } = options
    const { lastRecognizedIdentity } = getActivatedUI()
    const blankImage = await downloadUrl(
        getUrl(`${template === 'v2' ? '/image-payload' : '/wallet'}/payload-${template}.png`),
    )
    const secretImage = new Uint8Array(
        decodeArrayBuffer(
            await Services.Steganography.encodeImage(new Uint8Array(blankImage), {
                text,
                pass: lastRecognizedIdentity.value ? lastRecognizedIdentity.value.identifier.toText() : '',
                template,
                // ! the color image cannot compression resistance in Facebook
                grayscaleAlgorithm: GrayscaleAlgorithm.LUMINANCE,
            }),
        ),
    )
    pasteImageToActiveElements(secretImage)
    await untilDocumentReady()
    try {
        // Need a better way to find whether the image is pasted into
        // throw new Error('auto uploading is undefined')
    } catch {
        uploadFail()
    }

    async function uploadFail() {
        console.warn('Image not uploaded to the post box')
        if (confirm(warningText)) {
            await Services.Steganography.downloadImage(secretImage)
        }
    }
}

// ----- Image Encryption

const BytesInPixel = 4
const optimalWidth = 960 // https://louisem.com/1730/how-to-optimize-photos-for-facebook#:~:text=According%20to%20Facebook%2C%20they%20will,NOT%20be%20reduced%20in%20size.

// TODO: might want to move this somewhere more appropriate
export const rand = (min: number, max: number) => {
    // it is important that the number of states of the pseudo-random number generator is >> (much greater) than the number of states for which it generates the random values
    // for example, using pseudo random number generator that has 2 ** 32 states is a bad idea to generate all the permutations of the 52 playing deck of cards, since the latter has 2 ** 225.6! states
    // scrolls to the PRNG section here: https://www.wikiwand.com/en/Fisher%E2%80%93Yates_shuffle
    const randomNum = Math.random() * (max - min) + min
    return Math.round(randomNum)
}

type blockStartArgs = {
    blockIx: number
    imgWidth: number
    blockWidth: number
}

export const blockStart = ({ blockIx, imgWidth, blockWidth }: blockStartArgs) => {
    const blockCols = imgWidth / blockWidth
    return (
        Math.floor(blockIx / blockCols) * blockCols * BytesInPixel * blockWidth * blockWidth +
        BytesInPixel * (blockIx % blockCols) * blockWidth
    )
}

type swapPixelBlocksArgs = {
    img: Buffer
    imgWidth: number
    blockWidth: number
    blockIx1: number
    blockIx2: number
}

export const swapPixelBlocks = ({ img, imgWidth, blockWidth, blockIx1, blockIx2 }: swapPixelBlocksArgs) => {
    const blockStartIx1 = blockStart({ blockIx: blockIx1, imgWidth, blockWidth })
    const blockStartIx2 = blockStart({ blockIx: blockIx2, imgWidth, blockWidth })
    const widthDelta = imgWidth - blockWidth
    const blockPixelArea = blockWidth * blockWidth

    for (var k = 0; k < BytesInPixel * blockPixelArea; k = k + 1) {
        const lambda = BytesInPixel * Math.floor(k / (BytesInPixel * blockWidth))

        const copyToIx = blockStartIx1 + k + lambda * widthDelta
        const copyFromIx = blockStartIx2 + k + lambda * widthDelta
        const tmp = img[copyToIx]

        img[copyToIx] = img[copyFromIx]
        img[copyFromIx] = tmp
    }
}

type shuffleArgs = {
    file: typeof Jimp & { resize: (w: number, h: number, mode?: any, cb?: any) => void }
    blockWidth: number
}

// changes the image in place
const shuffle = ({ file, blockWidth }: shuffleArgs) => {
    const w = file.bitmap.width
    const h = file.bitmap.height

    if (w > optimalWidth) {
        // we want to preserve the aspect ratio here, but at the same time, ensure that we blockWidth blocks will fit into this new resized
        // image without us having to pad the image
        const aspectRatio = w / h
        const targetHeight = optimalWidth / aspectRatio
        file.resize(optimalWidth - (optimalWidth % blockWidth), targetHeight - (targetHeight % blockWidth))
    } else {
        // TODO: you might want to avoid the throws
        if (w < blockWidth) {
            throw new Error('blockWidth is larger than image width')
        }
        // * you can still get an image with a ridiculous height
        file.resize(w - (w % blockWidth), h - (h % blockWidth))
    }

    const totalBlocksNum = (w * h) / (blockWidth * blockWidth) // this will be a whole number, because we resize earlier
    const permutations: number[] = []
    const img = file.bitmap.data

    for (var blockNum = totalBlocksNum - 1; blockNum > 1; blockNum = blockNum - 1) {
        const r = rand(0, blockNum - 1) // ! might need to use rand(0, blockNum) depending on what the "off-by-one" error means (https://www.wikiwand.com/en/Fisher%E2%80%93Yates_shuffle)
        permutations.push(r)
        swapPixelBlocks({ img, imgWidth: w, blockWidth, blockIx1: blockNum, blockIx2: r })
    }

    return permutations
}

type deshuffleArgs = {
    file: typeof Jimp
    permutations: number[]
    blockWidth: number
}

const deshuffle = ({ file, permutations, blockWidth }: deshuffleArgs) => {
    const w = file.bitmap.width
    const h = file.bitmap.height
    const totalBlocksNum = (w * h) / (blockWidth * blockWidth) // this will be a whole number, because we resized earlier
    const img = file.bitmap.data
    const permutationsLen = permutations.length

    for (var blockNum = 1; blockNum < totalBlocksNum; blockNum = blockNum + 1) {
        // ! there is an error here somewhere with an index. one block does not get copied over
        const swapWith = permutations[permutationsLen - blockNum + 1]
        swapPixelBlocks({ img, imgWidth: w, blockWidth, blockIx1: swapWith, blockIx2: blockNum })
    }
}
