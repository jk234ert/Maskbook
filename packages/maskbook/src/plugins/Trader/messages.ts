import type { DataProvider } from './types'
import { createPluginMessage } from '../utils/createPluginMessage'
import { PLUGIN_IDENTIFIER } from './constants'
import { createPluginRPC } from '../utils/createPluginRPC'

interface CashTagEvent {
    name: string
    element: HTMLAnchorElement | null
    dataProviders: DataProvider[]
}

interface SwapSettingsEvent {
    open: boolean
}

interface PluginTraderMessage {
    /**
     * View a cash tag
     */
    cashTagObserved: CashTagEvent

    /**
     * Swap settings dialog
     */
    swapSettingsUpdated: SwapSettingsEvent
    rpc: unknown
}

export const PluginTraderMessages = createPluginMessage<PluginTraderMessage>(PLUGIN_IDENTIFIER)
export const PluginTraderRPC = createPluginRPC(
    PLUGIN_IDENTIFIER,
    () => import('./services'),
    PluginTraderMessages.events.rpc,
)
