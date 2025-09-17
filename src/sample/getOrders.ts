/**
 * Simple JS example demostrating accessing subaccount data with Indexer REST endpoints
 */

// import { Network } from "../src/clients/constants";
import {
  Network,
  OrderSide,
  OrderStatus,
  TickerType,
} from "@dydxprotocol/v4-client-js";
// import { IndexerClient } from "../src/clients/indexer-client";
import { IndexerClient } from "@dydxprotocol/v4-client-js";
import { getNetwork } from "./common";
// import { DYDX_TEST_ADDRESS } from "./constants";

async function test(): Promise<void> {
  const network = getNetwork();
  const client = new IndexerClient(network.indexerConfig);
  const address = "dydx10hqygpsfs7fvd0s43kw2qn9s0ff2ujw0cn0tz7";

  // Get orders
  try {
    const response = await client.account.getSubaccountOrders(
      address,
      0,
      "BTC-USD",
      TickerType.PERPETUAL,
      OrderSide.BUY,
      OrderStatus.OPEN
    );
    console.log(response);
  } catch (error) {
    console.log(error.message);
  }
}

test()
  .then(() => {})
  .catch((error) => {
    console.log(error.message);
  });
