import {
  IndexerConfig,
  Network,
  ValidatorConfig,
} from "@oraichain/lfg-client-js";
import "dotenv/config";

export const NETWORK_CONFIG = {
  devnet: {
    indexerConfig: {
      restEndpoint: "http://65.109.74.254:3002",
      websocketEndpoint: "http://65.109.74.254:3003",
    },
    validatorConfig: {
      restEndpoint: "https://rpc-lfg.orai.network",
    },
    chainId: "testing",
    denoms: {
      CHAINTOKEN_DENOM: "adv4tnt",
      USDC_DENOM:
        "ibc/8E27BA2D5493AF5636760E354E46004562C46AB7EC0CC4C1CA14E9E20E2545B5",
      USDC_GAS_DENOM: "uusdc",
      USDC_DECIMALS: 6,
      CHAINTOKEN_DECIMALS: 18,
    },
  },
  testnet: {
    indexerConfig: {
      restEndpoint: "https://indexer-lfg-testnet.orai.network/",
      websocketEndpoint: "https://socks-indexer-lfg-testnet.orai.network/",
    },
    validatorConfig: {
      restEndpoint: "https://rpc-lfg-testnet.orai.network/",
    },
    chainId: "lfg-testnet-1",
    denoms: {
      CHAINTOKEN_DENOM: "adv4tnt",
      USDC_DENOM: "uwusdc",
      USDC_GAS_DENOM: "uusdc",
      USDC_DECIMALS: 6,
      CHAINTOKEN_DECIMALS: 18,
    },
  },
};

export const getNetwork = (network: "devnet" | "testnet" = "devnet") => {
  // const network = Network.mainnet();
  // network.indexerConfig.restEndpoint = process.env.INDEXER_REST_URL!;
  // network.indexerConfig.websocketEndpoint = process.env.INDEXER_WEBSOCKET_URL!;
  // network.validatorConfig.restEndpoint = process.env.REST_URL!;
  // network.validatorConfig.chainId = process.env.CHAIN_ID!;
  // return network;

  const indexerConfig = new IndexerConfig(
    NETWORK_CONFIG[network].indexerConfig.restEndpoint,
    NETWORK_CONFIG[network].indexerConfig.websocketEndpoint
  );
  const validatorConfig = new ValidatorConfig(
    NETWORK_CONFIG[network].validatorConfig.restEndpoint,
    NETWORK_CONFIG[network].chainId,
    {
      CHAINTOKEN_DENOM: NETWORK_CONFIG[network].denoms.CHAINTOKEN_DENOM,
      USDC_DENOM: NETWORK_CONFIG[network].denoms.USDC_DENOM,
      USDC_GAS_DENOM: NETWORK_CONFIG[network].denoms.USDC_GAS_DENOM,
      USDC_DECIMALS: NETWORK_CONFIG[network].denoms.USDC_DECIMALS,
      CHAINTOKEN_DECIMALS: NETWORK_CONFIG[network].denoms.CHAINTOKEN_DECIMALS,
    },
    undefined,
    "Client Example"
  );
  return new Network(network, indexerConfig, validatorConfig);
};
