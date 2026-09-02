import type { Address } from 'viem';

export type TokenizedStock = {
  symbol: string;
  name: string;
  tokenAddress: Address;
  priceFeedAddress: Address;
  logoUri: string;
};

/**
 * Coinbase B20 tokenized stocks on Base.
 * Addresses and feeds: https://docs.base.org/specifications/b20/tokenized-stocks-on-base
 */
export const TOKENIZED_STOCKS: readonly TokenizedStock[] = [
  {
    symbol: 'AAPLc',
    name: 'Apple Inc.',
    tokenAddress: '0xb200000000000000000000C2e324d24d7eEcd1fb',
    priceFeedAddress: '0x787f13dEa48Db0897CbCDD985de77809D837F988',
    logoUri:
      'https://metadata.coinbase.com/equity_icons/873819f4b14efe44b94abecbc8e8864d2998163abd0ca55b449ee6eb07d0d94c.png',
  },
  {
    symbol: 'NVDAc',
    name: 'NVIDIA Corporation',
    tokenAddress: '0xb20000000000000000000078ee7ce2fE4908108C',
    priceFeedAddress: '0x04689a41629776563E6822F76f2e57D148d28513',
    logoUri:
      'https://metadata.coinbase.com/equity_icons/1fee9b7a44e800d438dd9d96c3283e05784c925c2c871a48ff735950740b551a.png',
  },
  {
    symbol: 'TSLAc',
    name: 'Tesla Inc.',
    tokenAddress: '0xb2000000000000000000001e800a7f5189430cD0',
    priceFeedAddress: '0xFaf869185383a24F8cb00e27BdA6b63B9905DCb4',
    logoUri:
      'https://metadata.coinbase.com/equity_icons/a3b67028295d0e9fa3182c867b8a9afed5ebcbd8c012de3a46e160ae5e490980.png',
  },
  {
    symbol: 'MSFTc',
    name: 'Microsoft Corporation',
    tokenAddress: '0xB200000000000000000000Ab99cFa739E253872B',
    priceFeedAddress: '0xeB10A6c9aa7E537aEd766C08c35Dae35B321b18c',
    logoUri:
      'https://metadata.coinbase.com/equity_icons/e90930ade985016f48816c6bd9fd1e8274b28507f4833881b3a16c77c2a3e2e7.png',
  },
  {
    symbol: 'GOOGLc',
    name: 'Alphabet Inc.',
    tokenAddress: '0xb2000000000000000000002D0BA3164cc74f58B7',
    priceFeedAddress: '0x5bF49E0ffA937CE2FfF033c739aD7C634c4D34F2',
    logoUri:
      'https://metadata.coinbase.com/equity_icons/0e80e31df40f7c42b49a3c7f6d23c6351625d73f235aeb69006ddee9221702b0.png',
  },
  {
    symbol: 'AMZNc',
    name: 'Amazon.com Inc.',
    tokenAddress: '0xb200000000000000000000d9192b6B456483C2E8',
    priceFeedAddress: '0x06A8E4b3aBB3B7543d8396FB2B763d22820cB295',
    logoUri:
      'https://metadata.coinbase.com/equity_icons/06d3c2cac2c89e3a8bc4b2fe40ff259f104b55244321dea400e44b22f215896b.png',
  },
  {
    symbol: 'METAc',
    name: 'Meta Platforms Inc.',
    tokenAddress: '0xb2000000000000000000008bC8786B856E61707C',
    priceFeedAddress: '0x6526aE6797A76123638b863AeE4dD27Ba4E4b27D',
    logoUri:
      'https://metadata.coinbase.com/equity_icons/1cedbfb3caee9498470945ff5041715b8c90921d904b3567a43bc4df82069e66.png',
  },
  {
    symbol: 'COINc',
    name: 'Coinbase Global Inc.',
    tokenAddress: '0xb200000000000000000000c85a31389D71F3ecfb',
    priceFeedAddress: '0x408e44f504A7371a345F03a73dDC96A4b48e8aa7',
    logoUri:
      'https://metadata.coinbase.com/equity_icons/fe40327c3d69c3c210e6d2b0819e69514f5be58dff6605507583170b7bb14790.png',
  },
];
