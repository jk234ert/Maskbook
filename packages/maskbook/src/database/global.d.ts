declare module 'idb/with-async-ittr-cjs' {
    export * from 'idb'
}
declare module 'metamask-extension-provider' {
    import type { EventEmitter } from 'events'
    import type { AbstractProvider } from 'web3-core'
    export class MetamaskInpageProvider extends EventEmitter implements AbstractProvider {
        sendAsync(payload: JsonRpcPayload, callback: (error: Error | null, result?: JsonRpcResponse) => void): void
        send?(payload: JsonRpcPayload, callback: (error: Error | null, result?: JsonRpcResponse) => void): void
        request(args: RequestArguments): Promise<any>
        connected?: boolean
        _metamask?: { isUnlocked: () => Promise<boolean> }
    }
}

declare module 'extension-port-stream' {
    import { Duplex } from 'stream'

    export default class PortStream extends Duplex {
        constructor(port: browser.runtime.Port): Duplex
    }
}
/**
 * IDBFactory v3
 */
interface IDBFactory {
    databases?(): Promise<Array<{ name: string; version: number }>>
}
type IF<Condition, True, False> = Condition extends true ? True : False
/**
 * Magic variable, used to debug
 */
declare const __line: number
