import { useCallback } from 'react'
import {
    makeStyles,
    Avatar,
    Typography,
    CardHeader,
    CardContent,
    CardActions,
    createStyles,
    Link,
    Paper,
    IconButton,
} from '@material-ui/core'
import { first, last } from 'lodash-es'
import { Currency, DataProvider, Stat, TradeProvider, Trending } from '../../types'
import {
    resolveDataProviderName,
    resolveDataProviderLink,
    resolveTradeProviderName,
    resolveTradeProviderLink,
} from '../../pipes'
import { formatCurrency } from '../../../Wallet/formatter'
import { PriceChanged } from './PriceChanged'
import { Linking } from './Linking'
import { useI18N } from '../../../../utils/i18n-next-ui'
import { CoinMarketCapIcon } from '../../../../resources/CoinMarketCapIcon'
import { UniswapIcon } from '../../../../resources/UniswapIcon'
import { MaskbookTextIcon } from '../../../../resources/MaskbookIcon'
import { TrendingCard, TrendingCardProps } from './TrendingCard'
import { DollarSign } from 'react-feather'
import { useRemoteControlledDialog } from '../../../../utils/hooks/useRemoteControlledDialog'
import { PluginTransakMessages } from '../../../Transak/messages'
import { useAccount } from '../../../../web3/hooks/useAccount'
import { Flags } from '../../../../utils/flags'
import { TokenIcon } from '../../../../extension/options-page/DashboardComponents/TokenIcon'
import { useStylesExtends } from '../../../../components/custom-ui-helper'

const useStyles = makeStyles((theme) => {
    return createStyles({
        root: {
            width: '100%',
            boxShadow: 'none',
            borderRadius: 0,
            marginBottom: theme.spacing(2),
            '&::-webkit-scrollbar': {
                display: 'none',
            },
        },
        content: {
            paddingTop: 0,
            paddingBottom: 0,
        },
        header: {
            display: 'flex',
            position: 'relative',
        },
        body: {},
        footer: {
            justifyContent: 'space-between',
        },
        title: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        tabs: {
            height: 35,
            width: '100%',
            minHeight: 'unset',
        },
        tab: {
            minHeight: 'unset',
            minWidth: 'unset',
        },
        rank: {
            color: theme.palette.text.primary,
            fontWeight: 300,
            marginRight: theme.spacing(1),
        },
        footnote: {
            fontSize: 10,
        },
        footlink: {
            cursor: 'pointer',
            marginRight: theme.spacing(0.5),
            '&:last-child': {
                marginRight: 0,
            },
        },
        avatar: {
            backgroundColor: theme.palette.common.white,
        },
        avatarFallback: {
            width: 40,
            height: 40,
        },
        currency: {
            marginRight: theme.spacing(1),
        },
        percentage: {
            marginLeft: theme.spacing(1),
        },
        maskbook: {
            width: 40,
            height: 10,
        },
        cmc: {
            width: 96,
            height: 16,
            verticalAlign: 'bottom',
        },
        uniswap: {
            width: 16,
            height: 16,
            verticalAlign: 'bottom',
        },
    })
})

export interface TrendingViewDeckProps extends withClasses<'header' | 'body' | 'footer' | 'content'> {
    stats: Stat[]
    currency: Currency
    trending: Trending
    dataProvider: DataProvider
    tradeProvider: TradeProvider
    children?: React.ReactNode
    showDataProviderIcon?: boolean
    showTradeProviderIcon?: boolean
    TrendingCardProps?: Partial<TrendingCardProps>
}

export function TrendingViewDeck(props: TrendingViewDeckProps) {
    const {
        currency,
        trending,
        dataProvider,
        tradeProvider,
        stats,
        children,
        showDataProviderIcon = false,
        showTradeProviderIcon = false,
        TrendingCardProps,
    } = props
    const { coin, market } = trending

    const { t } = useI18N()
    const classes = useStylesExtends(useStyles(), props)

    //#region buy
    const account = useAccount()
    const [, setBuyDialogOpen] = useRemoteControlledDialog(PluginTransakMessages.events.buyTokenDialogUpdated)

    const onBuyButtonClicked = useCallback(() => {
        setBuyDialogOpen({
            open: true,
            code: coin.symbol,
            address: account,
        })
    }, [account, trending?.coin?.symbol])
    //#endregion

    return (
        <TrendingCard {...TrendingCardProps}>
            <CardHeader
                className={classes.header}
                avatar={
                    <Linking href={first(coin.home_urls)}>
                        <Avatar className={classes.avatar} src={coin.image_url} alt={coin.symbol}>
                            {trending.coin.eth_address ? (
                                <TokenIcon
                                    classes={{ icon: classes.avatarFallback }}
                                    address={trending.coin.eth_address}
                                />
                            ) : null}
                        </Avatar>
                    </Linking>
                }
                title={
                    <div className={classes.title}>
                        <Typography variant="h6">
                            <Linking href={first(coin.home_urls)}>{coin.symbol.toUpperCase()}</Linking>
                            <span>{` / ${currency.name}`}</span>
                        </Typography>
                        {account && trending.coin.symbol && Flags.transak_enabled ? (
                            <IconButton color="primary" onClick={onBuyButtonClicked}>
                                <DollarSign size={18} />
                            </IconButton>
                        ) : null}
                    </div>
                }
                subheader={
                    <>
                        <Typography component="p" variant="body1">
                            {market ? (
                                <>
                                    <span className={classes.currency}>{currency.name}</span>
                                    <span>
                                        {formatCurrency(
                                            dataProvider === DataProvider.COIN_MARKET_CAP
                                                ? last(stats)?.[1] ?? market.current_price
                                                : market.current_price,
                                            currency.symbol,
                                        )}
                                    </span>
                                </>
                            ) : (
                                <span>{t('plugin_trader_no_data')}</span>
                            )}
                            {typeof market?.price_change_percentage_24h === 'number' ? (
                                <PriceChanged amount={market.price_change_percentage_24h} />
                            ) : null}
                        </Typography>
                    </>
                }
                disableTypography
            />
            <CardContent className={classes.content}>
                <Paper className={classes.body} elevation={0}>
                    {children}
                </Paper>
            </CardContent>

            <CardActions className={classes.footer}>
                <Typography className={classes.footnote} color="textSecondary" variant="subtitle2">
                    <span>Powered by </span>
                    <Link
                        className={classes.footlink}
                        color="textSecondary"
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Mask Network"
                        href="https://mask.io">
                        <MaskbookTextIcon classes={{ root: classes.maskbook }} viewBox="0 0 80 20" />
                    </Link>
                </Typography>
                {showDataProviderIcon ? (
                    <Typography className={classes.footnote} color="textSecondary" variant="subtitle2">
                        <span>Data source </span>
                        <Link
                            className={classes.footlink}
                            color="textSecondary"
                            target="_blank"
                            rel="noopener noreferrer"
                            title={resolveDataProviderName(dataProvider)}
                            href={resolveDataProviderLink(dataProvider)}>
                            {dataProvider === DataProvider.COIN_MARKET_CAP ? (
                                <CoinMarketCapIcon
                                    classes={{
                                        root: classes.cmc,
                                    }}
                                    viewBox="0 0 96 16"
                                />
                            ) : (
                                resolveDataProviderName(dataProvider)
                            )}
                        </Link>
                    </Typography>
                ) : null}
                {showTradeProviderIcon ? (
                    <Typography className={classes.footnote} color="textSecondary" variant="subtitle2">
                        <span>Based on </span>
                        <Link
                            className={classes.footlink}
                            color="textSecondary"
                            target="_blank"
                            rel="noopener noreferrer"
                            title={resolveTradeProviderName(tradeProvider)}
                            href={resolveTradeProviderLink(tradeProvider)}>
                            {tradeProvider === TradeProvider.UNISWAP ? (
                                <>
                                    <UniswapIcon classes={{ root: classes.uniswap }} viewBox="0 0 16 16" />
                                    {' V2'}
                                </>
                            ) : (
                                resolveTradeProviderName(tradeProvider)
                            )}
                        </Link>
                    </Typography>
                ) : null}
            </CardActions>
        </TrendingCard>
    )
}
