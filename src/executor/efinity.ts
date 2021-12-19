import { logger } from "../logger";
import { request, gql } from "graphql-request";
import { ContributionTask } from "../query";

export const PARA_ID = 2021;

const BATCH2_START_BLOCK = 8179677;

// cannot get last task committed.
export async function efinityFetcher(
  paraId: number
): Promise<ContributionTask[]> {
  logger.debug("Enter fetch efinity contribution");

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
            blockHeight: { greaterThanOrEqualTo: ${BATCH2_START_BLOCK}}
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
