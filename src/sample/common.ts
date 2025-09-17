import { Network } from "@dydxprotocol/v4-client-js";

export const getNetwork = () => {
  const network = Network.mainnet();
  network.indexerConfig.restEndpoint = "http://65.109.74.254:3002";
  network.indexerConfig.websocketEndpoint = "http://65.109.74.254:3003";
  network.validatorConfig.restEndpoint = "http://65.109.74.254:56657";
  network.validatorConfig.chainId = "testing";
  return network;
};
