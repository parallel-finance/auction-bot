import { gql, request } from "graphql-request";
import { logger } from "./logger";

type Maybe<T> = T | null;

export interface ContributionTask {
  id: string;
  blockHeight: number;
  paraId: number;
  amount: string;
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

// cannot get last task committed.
export async function fetchContributions(): Promise<ContributionTask[] | null> {
  logger.debug("Enter fetch Contribution");

  const {
    dotContributions: { nodes },
  } = await request(
    process.env.GRAPHQL_ENDPOINT!,
    gql`
      query {
        dotContributions(
          orderBy: BLOCK_HEIGHT_ASC
          first: 100
          filter: {
            transactionExecuted: { equalTo: false }
            isPending: { equalTo: false }
          }
        ) {
          nodes {
            id
            blockHeight
            paraId
            amount
          }
        }
      }
    `
  );
  logger.debug(`Fetch ${nodes.length} tasks`);
  return nodes;
}
