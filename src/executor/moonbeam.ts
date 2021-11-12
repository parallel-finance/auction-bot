import { ApiPromise } from "@polkadot/api";
import { gql, request } from "graphql-request";
import { ContributionTask } from "../query";
import { v4 as uuid } from "uuid";
import { logger } from "../logger";
import axios from "axios";

const PARA_ID = 2002;

const makeSignature = async (api: ApiPromise, task: ContributionTask) => {
  logger.debug(`Fetch signature of ${task.id}`);
  const {
    contributionSummaries: {
      nodes: [{ amount }],
    },
  } = await request(
    process.env.METRICS_ENDPOINT!!,
    gql`
      query {
        contributionSummaries(
          filter: {
            paraId: { equalTo: "${PARA_ID}" }
            account: { equalTo: "${process.env.PROXIED_ACCOUNT}" }
          }
        ) {
          nodes {
            amount
          }
        }
      }
    `
  );
  const guid = uuid();
  const blockHash = await api.rpc.chain.getBlockHash(task.blockHeight);
  const payload = {
    "lp-address": process.env.PROXIED_ACCOUNT,
    "lp-previous-total-contribution": amount,
    "lp-contribution": task.amount,
    guid,
    contributor: {
      "deposit-hash": task.id,
      "finalized-block": blockHash.toHex(),
      "contrib-address": task.account,
    },
  };
  logger.debug(`Make signature with payload: ${JSON.stringify(payload)}`);
  const res = await axios
    .post(process.env.SIGNATURE_ENDPOINT as string, payload, {
      headers: {
        "X-API-KEY": process.env.MOONBEAM_API_KEY as string,
        "Content-Type": "application/json; charset=utf-8",
      },
    })
    .catch((err) => err.response);
  if (!res || res.status !== 200) {
    logger.error(!!res ? "Connect failed" : res.data);
    return;
  }
  const { signature } = res.data;
  logger.info("Get signature: " + signature);
  return signature;
};

export const moonbeamExecutor = async (
  api: ApiPromise,
  task: ContributionTask
) => {
  const signature = await makeSignature(api, task);
  if (!signature) {
    return;
  }
  return api.tx.utility.batchAll([
    api.tx.system.remark(task.id),
    api.tx.proxy.proxy(
      process.env.PROXIED_ACCOUNT as string,
      null,
      api.tx.crowdloan.contribute(task.paraId, task.amount, {
        sr25519: signature,
      })
    ),
  ]);
};
