import _ from "lodash";
import Long from "long";

import "dotenv/config";

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
  ValidatorClient,
} from "@oraichain/lfg-client-js";
import { OrderBatchWithMarketId } from "@oraichain/lfg-client-js/src/clients/composite-client";
import { Network, OrderSide } from "@oraichain/lfg-client-js";
import { LocalWallet } from "@oraichain/lfg-client-js";
import { SubaccountInfo } from "@oraichain/lfg-client-js";
import { getNetwork } from "../utils";

const MAX_CLIENT_ID = 2 ** 32 - 1;

async function test(): Promise<void> {
  const wallet = await LocalWallet.fromMnemonic(
    // process.env.WASH_TRADE_MNEMONIC!,
    process.env.DYDX_TEST_MNEMONIC!,
    "lfg"
  );
  // console.log(wallet);
  // const network = Network.mainnet();

  // network.indexerConfig.restEndpoint = "http://65.109.74.254:3002";
  // network.indexerConfig.websocketEndpoint = "http://65.109.74.254:3003";

  // network.validatorConfig.restEndpoint = "http://65.109.74.254:56657";
  // network.validatorConfig.chainId = "testing";

  const network = getNetwork();

  const client = await ValidatorClient.connect(network.validatorConfig);
  // console.log("**Client**");
  //   console.log(client);

  const subaccount = SubaccountInfo.forLocalWallet(wallet, 0);
  console.log(subaccount);
  const tx = await client.post.deposit(
    subaccount,
    0,
    new Long(1_000_000_000_000)
  );
  console.log("**Deposit Tx**");
  console.log(tx);
}

test()
  .then(() => {})
  .catch((error) => {
    console.log(error.message);
  });
