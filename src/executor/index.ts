import { ApiPromise } from "@polkadot/api";
import { logger } from "../logger";
import { fetchContributions } from "../query";
import { mantaExecutor, PARA_ID as MANTA } from "./manta";
import { nodleExecutor, PARA_ID as NODLE } from "./nodle";
import { darwiniaExecutor, PARA_ID as DARWINIA } from "./darwinia";
import { interlayExecutor, PARA_ID as INTERLAY } from "./interlay";
import { centrifugeExecutor, PARA_ID as CENTRIFUGE } from "./centrifuge";
import { efinityFetcher, PARA_ID as EFINITY } from "./efinity";
import { equilibriumExecutor, PARA_ID as EQUILIBRIUM } from "./equilibrium";

export type Executor = typeof mantaExecutor;
export type Fetcher = typeof fetchContributions;

const defaultExecutor = async (
  api: ApiPromise,
  paraId: number,
  fetcher: Fetcher = fetchContributions
) => {
  const tasks = await fetcher(paraId);
  return tasks.map((task) => {
    logger.info(`Process tx of ${task.id}`);
    return api.tx.utility.batchAll([
      api.tx.system.remark(task.id),
      api.tx.proxy.proxy(
        process.env.PROXIED_ACCOUNT as string,
        null,
        api.tx.crowdloan.contribute(task.paraId, task.amount, null)
      ),
    ]);
  });
};

const defaultExecutorFactory =
  (paraId: number, fetcher: Fetcher = fetchContributions) =>
  (api: ApiPromise) =>
    defaultExecutor(api, paraId, fetcher);

const COINVERSATION = 2027;
const LITENTRY = 2013;
const PHALA = 2035;
const SUBGAME = 2017;

export const WHITELIST: { [paraId: number]: Executor } = {
  2002: defaultExecutorFactory(2002),
  2008: defaultExecutorFactory(2008),
  2036: defaultExecutorFactory(2036),
  [DARWINIA]: darwiniaExecutor,
  [NODLE]: nodleExecutor,
  [INTERLAY]: interlayExecutor,
  [EQUILIBRIUM]: equilibriumExecutor,
  [COINVERSATION]: defaultExecutorFactory(COINVERSATION),
  [LITENTRY]: defaultExecutorFactory(LITENTRY),
  [PHALA]: defaultExecutorFactory(PHALA),
  [SUBGAME]: defaultExecutorFactory(SUBGAME),
};
