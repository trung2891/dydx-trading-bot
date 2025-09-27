import { NETWORK_CONFIG, getNetwork } from "@/utils";
import { EncodeObject } from "@cosmjs/proto-signing";
import { Method } from "@cosmjs/tendermint-rpc";
import {
  BECH32_PREFIX,
  LocalWallet,
  Network,
  SubaccountInfo,
  ValidatorClient,
} from "@oraichain/lfg-client-js";
import Long from "long";

async function test(): Promise<void> {
  const env = "devnet";
  const wallet = await LocalWallet.fromMnemonic(
    process.env.LFG_TEST_MNEMONIC!,
    BECH32_PREFIX
  );
  console.log(wallet);
  const recipientAddress = "lfg10ns5tjh8lvq69gm097u9jsg5haanqpndn06xuj";

  const network = getNetwork(env);

  const client = await ValidatorClient.connect(network.validatorConfig);
  console.log("**Client**");
  console.log(client);

  const subaccount = SubaccountInfo.forLocalWallet(wallet, 0);

  const amount = new Long(1_000_000_000_000);

  const msgs: Promise<EncodeObject[]> = new Promise((resolve) => {
    const msg = client.post.composer.composeMsgSendToken(
      subaccount.address,
      recipientAddress,
      NETWORK_CONFIG[env].denoms.USDC_DENOM,
      amount.toString()
    );

    resolve([msg]);
  });

  const totalFee = await client.post.simulate(
    subaccount,
    () => msgs,
    undefined,
    undefined
  );
  console.log("**Total Fee**");
  console.log(totalFee);

  const amountAfterFee = amount.sub(Long.fromString(totalFee.amount[0].amount));
  console.log("**Amount after fee**");
  console.log(amountAfterFee);

  const tx = await client.post.sendToken(
    subaccount,
    recipientAddress,
    NETWORK_CONFIG[env].denoms.USDC_DENOM,
    amountAfterFee.toString(),
    false,
    Method.BroadcastTxCommit
  );
  console.log("**Send**");
  console.log(tx);
}

test()
  .then(() => {})
  .catch((error) => {
    console.log(error.message);
  });
