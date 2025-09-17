import _ from "lodash";

import "dotenv/config";
import {
  BECH32_PREFIX,
  Order_TimeInForce,
  CompositeClient,
  MAX_UINT_32,
  OrderTimeInForce,
  OrderType,
  OrderExecution,
  OrderFlags,
} from "@dydxprotocol/v4-client-js";
import { OrderBatchWithMarketId } from "@dydxprotocol/v4-client-js/src/clients/composite-client";
import { Network, OrderSide } from "@dydxprotocol/v4-client-js";
import { LocalWallet } from "@dydxprotocol/v4-client-js";
import { SubaccountInfo } from "@dydxprotocol/v4-client-js";
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

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function test(): Promise<void> {
  const wallet = await LocalWallet.fromMnemonic(
    process.env.DYDX_TEST_MNEMONIC,
    BECH32_PREFIX
  );
  // console.log(wallet);
  const network = getNetwork();

  // console.log(network);

  const client = await CompositeClient.connect(network);
  // console.log("**Client**");
  // console.log(client);
  const subaccount = SubaccountInfo.forLocalWallet(wallet, 0);

  /*
  Note this example places a stateful order.
  Programmatic traders should generally not use stateful orders for following reasons:
  - Stateful orders received out of order by validators will fail sequence number validation
    and be dropped.
  - Stateful orders have worse time priority since they are only matched after they are included
    on the block.
  - Stateful order rate limits are more restrictive than Short-Term orders, specifically max 2 per
    block / 20 per 100 blocks.
  - Stateful orders can only be canceled after they’ve been included in a block.
  */
  const longTermOrderClientId = randomInt(MAX_CLIENT_ID);
  try {
    // place a long term order
    const tx = await client.placeOrder(
      subaccount,
      "BTC-USD",
      OrderType.LIMIT,
      OrderSide.SELL,
      115000,
      0.001,
      longTermOrderClientId,
      OrderTimeInForce.GTT,
      600,
      OrderExecution.DEFAULT,
      false,
      false
    );
    console.log("**Long Term Order Tx**");
    console.log(tx.hash);
  } catch (error) {
    console.log("**Long Term Order Failed**");
    console.log(error.message);
  }

  await sleep(5000); // wait for placeOrder to complete

  // try {
  //   // cancel the long term order
  //   const tx = await client.cancelOrder(
  //     subaccount,
  //     811122302,
  //     OrderFlags.LONG_TERM,
  //     "BTC-USD",
  //     0,
  //     1760430104 - Math.floor(Date.now() / 1000)
  //   );
  //   console.log("**Cancel Long Term Order Tx**");
  //   console.log(tx);
  // } catch (error) {
  //   console.log("**Cancel Long Term Order Failed**");
  //   console.log(error.message);
  // }
}

test()
  .then(() => {})
  .catch((error) => {
    console.log(error.message);
  });
