import { ApiPromise } from "@polkadot/api";
import { gql, request } from "graphql-request";
import { ContributionTask } from "../query";
import { v4 as uuid } from "uuid";
import { logger } from "../logger";
import axios from "axios";
import userList from "../non_signed";

const userBlackList = userList.non_signed.map((row) => `"${row.account}"`);

export const PARA_ID = 2004;

const makeSignature = async (api: ApiPromise, task: ContributionTask) => {
  logger.debug(`Fetch signature of ${task.id}`);
  let {
    moonbeanContributions: {
      nodes: [result],
    },
  } = await request(
    process.env.GRAPHQL_ENDPOINT!!,
    gql`
      query {
        moonbeanContributions(
          filter: {
            id: { equalTo: "${PARA_ID}" }
          }
        ) {
          nodes {
            amount
          }
        }
      }
    `
  );
  let amount = result ? result.amount : "0";

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
    .post(
      `${process.env.SIGNATURE_ENDPOINT as string}/make-signature-lp`,
      payload,
      {
        headers: {
          "X-API-KEY": process.env.MOONBEAM_API_KEY as string,
          "Content-Type": "application/json; charset=utf-8",
        },
      }
    )
    .catch((err) => err.response);
  if (!res || res.status !== 200) {
    logger.error(
      !res ? "Connect failed" : `Request failed: ${JSON.stringify(res.data)}`
    );
    return;
  }
  const { signature } = res.data;
  logger.info("Get signature: " + signature);
  return signature;
};

async function fetchContributions(): Promise<ContributionTask[]> {
  const {
    dotContributions: { nodes },
  } = await request(
    process.env.GRAPHQL_ENDPOINT!,
    gql`
      query {
        dotContributions(
          orderBy: BLOCK_HEIGHT_ASC
          first: 1
          filter: {
            transactionExecuted: { equalTo: false }
            paraId: { equalTo: ${PARA_ID} }
            account: { notIn:  [${userBlackList}]}
          }
        ) {
          nodes {
            id
            blockHeight
            paraId
            account
            amount
          }
        }
      }
    `
  );
  logger.debug(`Fetch ${nodes.length} tasks of ${PARA_ID}`);
  return nodes;
}

export const moonbeamExecutor = async (api: ApiPromise) => {
  const tasks = await fetchContributions();
  return (
    await Promise.all(
      tasks.map(async (task) => {
        logger.info(`Process tx of ${task.id}`);
        const signature = await makeSignature(api, task);
        if (!signature) {
          return null;
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
          api.tx.proxy.proxy(
            process.env.PROXIED_ACCOUNT as string,
            null,
            api.tx.crowdloan.addMemo(
              task.paraId,
              "0x508eb96dc541c8E88A8A3fce4618B5fB9fA3f209"
            )
          ),
        ]);
      })
    )
  ).filter((e) => !!e);
};
