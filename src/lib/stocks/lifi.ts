import { formatUnits, getAddress, isAddress, type Address, type Hex } from 'viem';

const LIFI_QUOTE_URL = 'https://li.quest/v1/quote';
const BASE_CHAIN_ID = '8453';
const INTEGRATOR = 'base-stock-exchange';
const SLIPPAGE = 0.01;

type LifiToken = {
  address: string;
  symbol: string;
  decimals: number;
  name?: string;
};

type LifiStepAction = {
  fromToken?: LifiToken;
  toToken?: LifiToken;
};

type LifiIncludedStep = {
  type?: string;
  tool?: string;
  toolDetails?: { name?: string };
  action?: LifiStepAction;
};

export type LifiQuote = {
  tool: string;
  toolName: string;
  fromAmount: bigint;
  toAmount: bigint;
  toAmountMin: bigint;
  fromAmountUsd: number | null;
  toAmountUsd: number | null;
  fromDecimals: number;
  toDecimals: number;
  approvalAddress: Address;
  routeLabel: string;
  transaction: {
    to: Address;
    data: Hex;
    value: bigint;
    chainId: number;
  };
};

type LifiQuoteResponse = {
  message?: string;
  tool?: string;
  toolDetails?: { name?: string };
  estimate?: {
    approvalAddress?: string;
    toAmount?: string;
    toAmountMin?: string;
    fromAmount?: string;
    fromAmountUSD?: string;
    toAmountUSD?: string;
  };
  action?: {
    fromToken?: LifiToken;
    toToken?: LifiToken;
  };
  includedSteps?: LifiIncludedStep[];
  transactionRequest?: {
    to?: string;
    data?: string;
    value?: string;
    chainId?: number | string;
  };
};

export class SwapQuoteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SwapQuoteError';
  }
}

function asAddress(value: string | undefined): Address | null {
  if (!value || !isAddress(value)) {
    return null;
  }
  return getAddress(value);
}

function asHex(value: string | undefined): Hex | null {
  if (!value || !value.startsWith('0x')) {
    return null;
  }
  return value as Hex;
}

function asBigInt(value: string | undefined): bigint | null {
  if (value == null || value === '') {
    return null;
  }
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function parseUsd(value: string | undefined): number | null {
  if (value == null || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function routeLabel(response: LifiQuoteResponse): string {
  const hops = (response.includedSteps ?? [])
    .filter((step) => step.type === 'swap')
    .map((step) => {
      const from = step.action?.fromToken?.symbol;
      const to = step.action?.toToken?.symbol;
      if (from && to && from !== to) {
        return `${from} → ${to}`;
      }
      return step.toolDetails?.name ?? step.tool;
    })
    .filter((part): part is string => Boolean(part));

  if (hops.length > 0) {
    return hops.join(', ');
  }

  return response.toolDetails?.name ?? response.tool ?? 'DEX';
}

export async function fetchSwapQuote(input: {
  fromToken: Address;
  toToken: Address;
  fromAmount: bigint;
  fromAddress: Address;
}): Promise<LifiQuote> {
  const params = new URLSearchParams({
    fromChain: BASE_CHAIN_ID,
    toChain: BASE_CHAIN_ID,
    fromToken: input.fromToken,
    toToken: input.toToken,
    fromAmount: input.fromAmount.toString(),
    fromAddress: input.fromAddress,
    toAddress: input.fromAddress,
    slippage: String(SLIPPAGE),
    integrator: INTEGRATOR,
    allowBridges: 'none',
  });

  const response = await fetch(`${LIFI_QUOTE_URL}?${params.toString()}`);
  const body = (await response.json()) as LifiQuoteResponse;

  if (!response.ok) {
    throw new SwapQuoteError(
      body.message ?? 'No swap route for this pair yet.',
    );
  }

  const to = asAddress(body.transactionRequest?.to);
  const data = asHex(body.transactionRequest?.data);
  const approvalAddress = asAddress(body.estimate?.approvalAddress);
  const fromAmount = asBigInt(body.estimate?.fromAmount) ?? input.fromAmount;
  const toAmount = asBigInt(body.estimate?.toAmount);
  const toAmountMin = asBigInt(body.estimate?.toAmountMin);
  const value = asBigInt(body.transactionRequest?.value) ?? 0n;
  const fromDecimals = body.action?.fromToken?.decimals;
  const toDecimals = body.action?.toToken?.decimals;

  if (
    !to ||
    !data ||
    !approvalAddress ||
    toAmount == null ||
    toAmountMin == null ||
    fromDecimals == null ||
    toDecimals == null
  ) {
    throw new SwapQuoteError('No swap route for this pair yet.');
  }

  return {
    tool: body.tool ?? 'lifi',
    toolName: body.toolDetails?.name ?? body.tool ?? 'DEX',
    fromAmount,
    toAmount,
    toAmountMin,
    fromAmountUsd: parseUsd(body.estimate?.fromAmountUSD),
    toAmountUsd: parseUsd(body.estimate?.toAmountUSD),
    fromDecimals,
    toDecimals,
    approvalAddress,
    routeLabel: routeLabel(body),
    transaction: {
      to,
      data,
      value,
      chainId: Number(body.transactionRequest?.chainId ?? BASE_CHAIN_ID),
    },
  };
}

export function formatQuoteAmount(amount: bigint, decimals: number): string {
  const asNumber = Number(formatUnits(amount, decimals));
  const maximumFractionDigits = decimals <= 6 ? 6 : 8;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(asNumber);
}
