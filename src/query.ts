import { gql, request } from "graphql-request";
import { logger } from "./logger";

type Maybe<T> = T | null;

export interface ContributionTask {
  id: string;
  blockHeight: number;
  paraId: number;
  amount: string;
  referralCode?: string;
}

export async function nextProcessBlock(): Promise<number> {
  const {
    _metadata: { lastProcessedHeight },
  } = await request(
    process.env.GRAPHQL_ENDPOINT!,
    gql`
      query {
        _metadata {
          lastProcessedHeight
        }
      }
    `
  );
  return lastProcessedHeight;
}

async function checkUnresolvedBlock(): Promise<Maybe<[number, number]>> {
  logger.debug("Fetch first task information");
  const {
    dotContributions: { nodes },
  } = await request(
    process.env.GRAPHQL_ENDPOINT!,
    gql`
      query {
        dotContributions(
          first: 200
          orderBy: BLOCK_HEIGHT_ASC
          filter: { transactionExecuted: { equalTo: false } }
        ) {
          nodes {
            blockHeight
          }
        }
      }
    `
  );
  if (nodes.length === 0) {
    logger.info("No new contribution");
    return null;
  }

  const begin = nodes[0].blockHeight;
  const end = nodes[nodes.length - 1].blockHeight;

  return [begin, end];
}

// cannot get last task committed.
export async function fetchContributions(): Promise<ContributionTask[] | null> {
  logger.debug("Enter fetch Contribution");
  // const blockRange = await checkUnresolvedBlock();
  //
  // if (!blockRange) {
  //   return null;
  // }

  const {
    dotContributions: { nodes },
  } = await request(
    process.env.GRAPHQL_ENDPOINT!,
    gql`
      query {
        dotContributions(
          orderBy: BLOCK_HEIGHT_ASC
          first: 100
          filter: { transactionExecuted: { equalTo: false } }
        ) {
          nodes {
            id
            blockHeight
            paraId
            amount
            referralCode
          }
        }
      }
    `
  );
  logger.debug(`Fetch ${nodes.length} tasks`);
  return nodes;
}
