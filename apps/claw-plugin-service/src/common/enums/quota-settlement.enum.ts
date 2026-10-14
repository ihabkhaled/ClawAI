/** What happens to a held PLUGIN_CALLS run: it counts (the tool delivered) or it is given back. */
export enum QuotaSettlement {
  CONSUME = 'CONSUME',
  RELEASE = 'RELEASE',
}
