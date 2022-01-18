"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.efinityFetcher = exports.PARA_ID = void 0;
const logger_1 = require("../logger");
const graphql_request_1 = require("graphql-request");
exports.PARA_ID = 2021;
const BATCH2_START_BLOCK = 8179677;
// cannot get last task committed.
function efinityFetcher(paraId) {
    return __awaiter(this, void 0, void 0, function* () {
        logger_1.logger.debug("Enter fetch efinity contribution");
        const { dotContributions: { nodes }, } = yield (0, graphql_request_1.request)(process.env.GRAPHQL_ENDPOINT, (0, graphql_request_1.gql) `
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
    `);
        logger_1.logger.debug(`Fetch ${nodes.length} tasks of ${paraId}`);
        nodes.forEach((node) => logger_1.logger.debug(`Task: ${node.id}`));
        return nodes;
    });
}
exports.efinityFetcher = efinityFetcher;
