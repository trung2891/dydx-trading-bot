import _ from "lodash";

import "dotenv/config";
import {
  BECH32_PREFIX,
  Order_TimeInForce,
  CompositeClient,
  MAX_UINT_32,
} from "@oraichain/lfg-client-js";
import { OrderBatchWithMarketId } from "@oraichain/lfg-client-js/src/clients/composite-client";
import { Network, OrderSide } from "@oraichain/lfg-client-js";
import { LocalWallet } from "@oraichain/lfg-client-js";
import { SubaccountInfo } from "@oraichain/lfg-client-js";
import { getNetwork } from "./common";

const MAX_CLIENT_ID = 2 ** 32 - 1;

type OrderInfo = {
  marketId: string;
  clientId: number;
  side: OrderSide;
  price: number;
  size: number;
};

/**
 * Returns a random integer value between 0 and (n-1).
 */
export function randomInt(n: number): number {
  return Math.floor(Math.random() * n);
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a random clientId.
 */
export function generateRandomClientId(): number {
  return randomInt(MAX_UINT_32 + 1);
}

const generateShortTermOrdersInfo = (): OrderInfo[] => [
  {
    marketId: "ETH-USD",
    clientId: randomInt(MAX_CLIENT_ID),
    side: OrderSide.SELL,
    price: 5000,
    size: 0.001,
  },
  {
    marketId: "ETH-USD",
    clientId: randomInt(MAX_CLIENT_ID),
    side: OrderSide.SELL,
    price: 5200,
    size: 0.002,
  },
  {
    marketId: "BTC-USD",
    clientId: randomInt(MAX_CLIENT_ID),
    side: OrderSide.BUY,
    price: 40000,
    size: 0.0001,
  },
];

const generateBatchCancelShortTermOrders = (
  ordersInfo: OrderInfo[]
): OrderBatchWithMarketId[] => {
  const ordersGroupedByMarketIds = _.groupBy(
    ordersInfo,
    (info) => info.marketId
  );
  return Object.keys(ordersGroupedByMarketIds).map((marketId) => ({
    marketId,
    clientIds: ordersGroupedByMarketIds[marketId].map((info) => info.clientId),
  }));
};

async function test(): Promise<void> {
  try {
    const wallet = await LocalWallet.fromMnemonic(
      process.env.DYDX_TEST_MNEMONIC!,
      "lfg"
    );
    // console.log("**Wallet**", wallet);

    const network = getNetwork();
    const client = await CompositeClient.connect(network);
    // console.log("**Client**", client);

    const subaccount = SubaccountInfo.forLocalWallet(wallet, 0);
    const currentBlock = await client.validatorClient.get.latestBlockHeight();
    const goodTilBlock = currentBlock + 10;

    const shortTermOrdersInfo = generateShortTermOrdersInfo();
    await placeShortTermOrders(
      client,
      subaccount,
      shortTermOrdersInfo,
      goodTilBlock
    );

    return;
    await sleep(5000);
    await batchCancelOrders(
      client,
      subaccount,
      shortTermOrdersInfo,
      goodTilBlock
    );
  } catch (error) {
    console.error("**Test Failed**", error.message);
  }
}

const placeShortTermOrders = async (
  client: CompositeClient,
  subaccount: SubaccountInfo,
  shortTermOrdersInfo: OrderInfo[],
  goodTilBlock: number
): Promise<void> => {
  const orderPromises = shortTermOrdersInfo.map(async (order) => {
    try {
      const tx = await client.placeShortTermOrder(
        subaccount,
        order.marketId,
        order.side,
        order.price,
        order.size,
        order.clientId,
        goodTilBlock,
        Order_TimeInForce.TIME_IN_FORCE_UNSPECIFIED,
        false
      );
      console.log("**Short Term Order Tx**", tx.hash);
    } catch (error) {
      console.error(
        `**Short Term Order Failed for Market ${order.marketId}, Client ID ${order.clientId}**`,
        error.message
      );
    }
  });

  // Wait for all order placements to complete
  await Promise.all(orderPromises);
};

const batchCancelOrders = async (
  client: CompositeClient,
  subaccount: SubaccountInfo,
  shortTermOrdersInfo: OrderInfo[],
  goodTilBlock: number
): Promise<void> => {
  const shortTermOrdersPayload =
    generateBatchCancelShortTermOrders(shortTermOrdersInfo);
  try {
    const tx = await client.batchCancelShortTermOrdersWithMarketId(
      subaccount,
      shortTermOrdersPayload,
      goodTilBlock + 10
    );
    console.log("**Batch Cancel Short Term Orders Tx**", tx);
  } catch (error) {
    console.error("**Batch Cancel Short Term Orders Failed**", error.message);
  }
};

test()
  .then(() => {
    console.log("**Batch Cancel Test Completed Successfully**");
  })
  .catch((error) => {
    console.error("**Batch Cancel Test Execution Error**", error.message);
  });
