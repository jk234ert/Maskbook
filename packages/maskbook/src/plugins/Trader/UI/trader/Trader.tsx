import { useState, useCallback, useEffect, useRef } from 'react'
import { makeStyles, createStyles, CircularProgress } from '@material-ui/core'
import BigNumber from 'bignumber.js'
import { useStylesExtends } from '../../../../components/custom-ui-helper'
import { ERC20TokenDetailed, EthereumTokenType, EtherTokenDetailed } from '../../../../web3/types'
import { useConstant } from '../../../../web3/hooks/useConstant'
import { useTrade } from '../../trader/uniswap/useTrade'
import { TradeForm } from './TradeForm'
import { TradeRoute } from './TradeRoute'
import { TradeSummary } from './TradeSummary'
import { ConfirmDialog } from './ConfirmDialog'
import { useERC20TokenApproveCallback, ApproveState } from '../../../../web3/hooks/useERC20TokenApproveCallback'
import { useComputedApprove } from '../../trader/uniswap/useComputedApprove'
import { useSwapCallback } from '../../trader/uniswap/useSwapCallback'
import { useSwapState, SwapActionType } from '../../trader/uniswap/useSwapState'
import { TradeStrategy, TokenPanelType } from '../../types'
import { CONSTANTS } from '../../../../web3/constants'
import { TRADE_CONSTANTS } from '../../constants'
import { sleep } from '../../../../utils/utils'
import { TransactionStateType } from '../../../../web3/hooks/useTransactionState'
import { SelectERC20TokenDialog } from '../../../../web3/UI/SelectERC20TokenDialog'
import { useRemoteControlledDialog } from '../../../../utils/hooks/useRemoteControlledDialog'
import { WalletMessages } from '../../../Wallet/messages'
import { useShareLink } from '../../../../utils/hooks/useShareLink'
import { useTokenDetailed } from '../../../../web3/hooks/useTokenDetailed'

const useStyles = makeStyles((theme) => {
    return createStyles({
        root: {
            display: 'flex',
            flexDirection: 'column',
            minHeight: 266,
            position: 'relative',
        },
        progress: {
            bottom: theme.spacing(1),
            right: theme.spacing(1),
            position: 'absolute',
        },
        summary: {
            marginTop: theme.spacing(1),
        },
        router: {
            marginTop: 0,
        },
    })
})

export interface TraderProps extends withClasses<KeysInferFromUseStyles<typeof useStyles>> {
    address: string
    name: string
    symbol: string
}

export function Trader(props: TraderProps) {
    const ETH_ADDRESS = useConstant(CONSTANTS, 'ETH_ADDRESS')

    const { address, name, symbol } = props
    const classes = useStylesExtends(useStyles(), props)

    //#region swap state
    const [swapStore, dispatchSwapStore] = useSwapState(undefined, undefined)
    const { inputToken, outputToken } = swapStore

    const [inputTokenAddress, setInputTokenAddress] = useState(ETH_ADDRESS)
    const [outputTokenAddress, setOutputTokenAddress] = useState(address === ETH_ADDRESS ? '' : address)

    const isEtherInput = inputTokenAddress === ETH_ADDRESS
    const isEtherOutput = outputTokenAddress === ETH_ADDRESS

    const asyncInputTokenDetailed = useTokenDetailed(
        isEtherInput ? EthereumTokenType.Ether : EthereumTokenType.ERC20,
        isEtherInput ? ETH_ADDRESS : inputTokenAddress,
        {
            name,
            symbol,
        },
    )
    const asyncOutputTokenDetailed = useTokenDetailed(
        isEtherOutput ? EthereumTokenType.Ether : EthereumTokenType.ERC20,
        isEtherOutput ? ETH_ADDRESS : outputTokenAddress,
        {
            name,
            symbol,
        },
    )

    useEffect(() => {
        dispatchSwapStore({
            type: SwapActionType.UPDATE_INPUT_TOKEN,
            token: asyncInputTokenDetailed.value,
        })
        dispatchSwapStore({
            type: SwapActionType.UPDATE_OUTPUT_TOKEN,
            token: asyncOutputTokenDetailed.value,
        })
    }, [asyncInputTokenDetailed.value, asyncOutputTokenDetailed.value])
    //#endregion

    //#region switch tokens
    const onReverseClick = useCallback(() => {
        dispatchSwapStore({
            type: SwapActionType.SWITCH_TOKEN,
        })
    }, [])
    //#endregion

    //#region the best trade
    const { inputAmount, outputAmount, strategy } = swapStore

    const onInputAmountChange = useCallback((amount: string) => {
        dispatchSwapStore({
            type: SwapActionType.UPDATE_INPUT_AMOUNT,
            amount,
        })
    }, [])
    const onOutputAmountChange = useCallback((amount: string) => {
        dispatchSwapStore({
            type: SwapActionType.UPDATE_OUTPUT_AMOUNT,
            amount,
        })
    }, [])

    const uniswapTrade_ = useTrade(strategy, inputAmount, outputAmount, inputToken, outputToken)

    // the cached trade will freeze UI from updating when transaction was just confirmed
    const [freezed, setFreezed] = useState(false)
    const tradeCached_ = useRef<ReturnType<typeof useTrade>>({
        v2Trade: null,
    })
    useEffect(() => {
        if (freezed) tradeCached_.current = uniswapTrade_
    }, [freezed])

    // the real tread for UI
    const trade = freezed ? tradeCached_.current : uniswapTrade_

    // only keeps 6 digits in the fraction part for the estimation amount
    const isExactIn = strategy === TradeStrategy.ExactIn
    const estimatedInputAmount = new BigNumber(trade.v2Trade?.inputAmount.toSignificant(6) ?? '0')
        .multipliedBy(new BigNumber(10).pow(trade.v2Trade?.route.input.decimals ?? 0))
        .toFixed()
    const estimatedOutputAmount = new BigNumber(trade.v2Trade?.outputAmount.toSignificant(6) ?? '0')
        .multipliedBy(new BigNumber(10).pow(trade.v2Trade?.route.output.decimals ?? 0))
        .toFixed()
    //#endregion

    //#region select erc20 tokens
    const excludeTokens = [inputToken, outputToken].filter(Boolean).map((x) => x?.address) as string[]
    const [openSelectERC20TokenDialog, setOpenSelectERC20TokenDialog] = useState(false)
    const [focusedTokenPanelType, setfocusedTokenPanelType] = useState(TokenPanelType.Input)
    const onTokenChipClick = useCallback((type: TokenPanelType) => {
        setOpenSelectERC20TokenDialog(true)
        setfocusedTokenPanelType(type)
    }, [])
    const onSelectERC20TokenDialogClose = useCallback(() => {
        setOpenSelectERC20TokenDialog(false)
    }, [])
    const onSelectERC20TokenDialogSubmit = useCallback(
        (token: EtherTokenDetailed | ERC20TokenDetailed) => {
            dispatchSwapStore({
                type:
                    focusedTokenPanelType === TokenPanelType.Input
                        ? SwapActionType.UPDATE_INPUT_TOKEN
                        : SwapActionType.UPDATE_OUTPUT_TOKEN,
                token,
            })
            onSelectERC20TokenDialogClose()
        },
        [focusedTokenPanelType, onSelectERC20TokenDialogClose],
    )
    //#endregion

    //#region approve
    const RouterV2Address = useConstant(TRADE_CONSTANTS, 'ROUTER_V2_ADDRESS')
    const { approveToken, approveAmount } = useComputedApprove(trade.v2Trade)
    const [approveState, approveCallback] = useERC20TokenApproveCallback(
        approveToken?.address ?? '',
        approveAmount,
        RouterV2Address,
    )
    const onApprove = useCallback(async () => {
        if (approveState !== ApproveState.NOT_APPROVED) return
        await approveCallback()
    }, [approveState])
    //#endregion

    //#region blocking (swap)
    const [swapState, swapCallback, resetSwapCallback] = useSwapCallback(trade.v2Trade)
    const [openConfirmDialog, setOpenConfirmDialog] = useState(false)
    const onConfirmDialogConfirm = useCallback(async () => {
        setOpenConfirmDialog(false)
        await sleep(100)
        setFreezed(true)
        await swapCallback()
    }, [swapCallback])
    const onConfirmDialogClose = useCallback(() => {
        setOpenConfirmDialog(false)
    }, [])
    //#endregion

    //#region remote controlled transaction dialog
    const shareLink = useShareLink(
        trade.v2Trade
            ? [
                  `I just swapped ${trade.v2Trade.inputAmount.toSignificant(6)} ${
                      trade.v2Trade.inputAmount.currency.symbol
                  } for ${trade.v2Trade.outputAmount.toSignificant(6)} ${
                      trade.v2Trade.outputAmount.currency.symbol
                  }. Follow @realMaskbook (mask.io) to swap cryptocurrencies on Twitter.`,
                  '#mask_io',
              ].join('\n')
            : '',
    )

    // close the transaction dialog
    const [_, setTransactionDialogOpen] = useRemoteControlledDialog(
        WalletMessages.events.transactionDialogUpdated,
        (ev) => {
            if (ev.open) return
            setFreezed(false)
            if (swapState.type === TransactionStateType.HASH) {
                dispatchSwapStore({
                    type: SwapActionType.UPDATE_INPUT_AMOUNT,
                    amount: '0',
                })
                dispatchSwapStore({
                    type: SwapActionType.UPDATE_OUTPUT_AMOUNT,
                    amount: '0',
                })
            }
            resetSwapCallback()
        },
    )

    // open the transaction dialog
    useEffect(() => {
        if (swapState.type === TransactionStateType.UNKNOWN) return
        setTransactionDialogOpen({
            open: true,
            shareLink,
            state: swapState,
            summary: trade.v2Trade
                ? `Swapping ${trade.v2Trade.inputAmount.toSignificant(6)} ${
                      trade.v2Trade.inputAmount.currency.symbol
                  } for ${trade.v2Trade.outputAmount.toSignificant(6)} ${trade.v2Trade.outputAmount.currency.symbol}`
                : '',
        })
    }, [swapState /* update tx dialog only if state changed */])
    //#endregion

    return (
        <div className={classes.root}>
            <TradeForm
                approveState={approveState}
                strategy={strategy}
                trade={trade.v2Trade}
                inputToken={inputToken}
                outputToken={outputToken}
                inputAmount={
                    isExactIn ? trade.v2Trade?.inputAmount.raw.toString() ?? inputAmount : estimatedInputAmount
                }
                outputAmount={
                    isExactIn ? estimatedOutputAmount : trade.v2Trade?.outputAmount.raw.toString() ?? outputAmount
                }
                onInputAmountChange={onInputAmountChange}
                onOutputAmountChange={onOutputAmountChange}
                onReverseClick={onReverseClick}
                onTokenChipClick={onTokenChipClick}
                onApprove={onApprove}
                onSwap={() => setOpenConfirmDialog(true)}
            />
            {asyncInputTokenDetailed.loading || asyncOutputTokenDetailed.loading ? (
                <CircularProgress className={classes.progress} size={15} />
            ) : (
                <>
                    <TradeSummary
                        classes={{ root: classes.summary }}
                        trade={trade.v2Trade}
                        strategy={strategy}
                        inputToken={inputToken}
                        outputToken={outputToken}
                    />
                    <TradeRoute classes={{ root: classes.router }} trade={trade.v2Trade} strategy={strategy} />
                </>
            )}
            <ConfirmDialog
                trade={trade.v2Trade}
                strategy={strategy}
                inputToken={inputToken}
                outputToken={outputToken}
                open={openConfirmDialog}
                onConfirm={onConfirmDialogConfirm}
                onClose={onConfirmDialogClose}
            />
            <SelectERC20TokenDialog
                open={openSelectERC20TokenDialog}
                excludeTokens={excludeTokens}
                onSubmit={onSelectERC20TokenDialogSubmit}
                onClose={onSelectERC20TokenDialogClose}
            />
        </div>
    )
}
