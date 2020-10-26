/**
 * Load service here. sorry for the ugly pattern.
 * But here's some strange problem with webpack.
 *
 * you should also add register in './extension/service.ts'
 */
import * as CryptoService from './extension/background-script/CryptoService'
import * as WelcomeService from './extension/background-script/WelcomeService'
import * as IdentityService from './extension/background-script/IdentityService'
import * as UserGroupService from './extension/background-script/UserGroupService'
import * as SteganographyService from './extension/background-script/SteganographyService'
import * as PluginService from './extension/background-script/PluginService'
import * as HelperService from './extension/background-script/HelperService'
import * as ProviderService from './extension/background-script/ProviderService'
import * as ImageShuffleService from './extension/background-script/ImageShuffleService'
import * as EthereumService from './extension/background-script/EthereumService'
import { upload as pluginArweaveUpload } from './plugins/FileService/arweave/index'
import { sendTransaction } from './extension/background-script/EthereumServices/transaction'
import {
    decryptFromText,
    decryptFromImageUrl,
    decryptFromShuffledImage,
} from './extension/background-script/CryptoServices/decryptFrom'

Object.assign(globalThis, {
    CryptoService,
    WelcomeService,
    SteganographyService,
    IdentityService,
    UserGroupService,
    PluginService,
    HelperService,
    ProviderService,
    ImageShuffleService,
    EthereumService,
})

Object.assign(globalThis, {
    ServicesWithProgress: {
        pluginArweaveUpload,
        decryptFromText,
        decryptFromImageUrl,
        sendTransaction,
        decryptFromShuffledImage,
    },
})
