import { gql, request } from "graphql-request";
import { logger } from "./logger";

type Maybe<T> = T | null;

export interface ContributionTask {
  id: string;
  blockHeight: number;
  account: string;
  paraId: number;
  amount: string;
}

export async function nextProcessBlock(): Promise<number> {
  const ENDPOINTS = [
    process.env.GRAPHQL_ENDPOINT!,
    // process.env.METRICS_ENDPOINT!,
  ];

  const lastHeights: number[] = await Promise.all(
    ENDPOINTS.map((endpoint) =>
      request(
        endpoint,
        gql`
          query {
            _metadata {
              lastProcessedHeight
            }
          }
        `
      ).then(({ _metadata: { lastProcessedHeight } }) => lastProcessedHeight)
    )
  );
  return Math.min(...lastHeights);
}

// cannot get last task committed.
export async function fetchContributions(
  paraId: number
): Promise<ContributionTask[]> {
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
            paraId: { equalTo: ${paraId} }
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
  logger.debug(`Fetch ${nodes.length} tasks of ${paraId}`);
  nodes.forEach((node: ContributionTask) => logger.debug(`Task: ${node.id}`));
  return nodes;
}
