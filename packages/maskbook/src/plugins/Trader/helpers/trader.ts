import BigNumber from 'bignumber.js'

/**
 * Bips to percentage
 * @param value
 */
export function toPercentage(bips: number) {
    return `${new BigNumber(bips).dividedBy(10000).multipliedBy(100).toFixed()}%`
}
