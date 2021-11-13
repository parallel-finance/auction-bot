import {
  ContributionTask,
  fetchContributions,
  nextProcessBlock,
} from "./query";
import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
import dotenv from "dotenv";

import axios from "axios";
import { gql, request } from "graphql-request";
import { logger } from "./logger";
const fs = require('fs');

dotenv.config();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const { PROXY_ACCOUNT_SEED, RELAY_ENDPINT } = process.env;

async function main() {
  const provider = new WsProvider(RELAY_ENDPINT);

  provider.on("error", () => {
    logger.error("Websocket disconnect");
    process.exit(1);
  });

  logger.info(`Connect to ${RELAY_ENDPINT}`);
  const api = await ApiPromise.create({
    provider,
  });

  const paraId = 2004

  const {
    dotContributions: { nodes },
  } = await request(
    process.env.GRAPHQL_ENDPOINT!,
    gql`
      query {
        dotContributions(
          last: 5
          orderBy: BLOCK_HEIGHT_ASC
          filter: {
            paraId: { equalTo: ${paraId} }
          }
        ) {
          nodes {
            paraId
            blockHeight
            account
          	amount
          }
        }
      }
    `
  );

  logger.debug(`Fetch ${nodes.length} tasks of ${paraId}`);

  const total_records: any = []
  const signed: any = []
  const non_signed: any = []

  const start = async () => {
    await asyncForEach(nodes, async (node: ContributionTask) => {
      const { account, amount, paraId, blockHeight } = node;
      await axios.get(`https://krwc8r47pq.api.purestake.io/check-remark/${account}`, {
        headers: {
          'x-api-key': 'j9rxFbNReP26EIHiS9JIs7qEExi8QEmq1oGP8AJN'
        }
      }).then(res => {
        logger.debug(`${account} is ${JSON.stringify(res.data)}`);
        let verified = JSON.parse((JSON.stringify(res.data)))['verified']
        total_records.push({ 'account': account, 'amount': amount, 'height': blockHeight, paraId: paraId, 'verified': verified })
        
        if (verified === true) {
          signed.push({ 'account': account, 'amount': amount, 'height': blockHeight, paraId: paraId, 'verified': verified })
        }
        
        if (verified === false) {
          non_signed.push({ 'account': account, 'amount': amount, 'height': blockHeight, paraId: paraId, 'verified': verified })
        }
      }).catch(err => {
        logger.error(`error is ${err}`);
      });
    });

    fs.appendFileSync('data_total_records.json', JSON.stringify({ "total_records": total_records }) + ',\n', () => {
      console.log('File has been saved!');
    });

    fs.appendFileSync('data_signed.json', JSON.stringify({ "signed": signed }) + ',\n', () => {
      console.log('File has been saved!');
    });

    fs.appendFileSync('data_non_signed.json', JSON.stringify({"non_signed": non_signed}) + ',\n', () => {
      console.log('File has been saved!');
    });

    console.log('Done');
  }

  await start();
}

async function asyncForEach(array: any, callback: any) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

async function query(account: string) {
  // logger.debug(`account is ${account}`);
  await axios.get(`https://krwc8r47pq.api.purestake.io/check-remark/${account}`, {
    headers: {
      'x-api-key': 'j9rxFbNReP26EIHiS9JIs7qEExi8QEmq1oGP8AJN'
    }
  }).then(res => {
    // const str = JSON.stringify(res.data);
    logger.debug(`${account} is ${JSON.stringify(res.data)}`);
    // body.push({'account': account, 'verified': res.data})
    return JSON.stringify(res.data)
  }).catch(err => {
    logger.error(`${account} is ${err}`);
  });
}


main()
  .then(() => process.exit(0))
  .catch((e) => {
    logger.error(e.message);
    process.exit(1);
  });
