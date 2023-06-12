import { storageClient } from "./client/storageClient";
import { getResource } from "./useCases/getResource";
import { handleCompleteOnlineCollection } from "./useCases/handleCompleteOnlineCollection";
import { handleStartOnlineCollection } from "./useCases/handleStartOnlineCollection";
import { showPayPage } from "./useCases/showPayPage";
import { buildXml } from "./useCaseHelpers/buildXml";
import { getCompletedTransaction } from "./persistence/getCompletedTransaction";
import { getTransactionRequest } from "./persistence/getTransactionRequest";
import { saveCompletedTransaction } from "./persistence/saveCompletedTransaction";

export function createAppContext() {
  return {
    useCases: () => ({
      getResource,
      handleCompleteOnlineCollection,
      handleStartOnlineCollection,
      showPayPage,
    }),
    useCaseHelpers: () => ({
      buildXml,
    }),
    persistenceGateway: () => ({
      getCompletedTransaction,
      getTransactionRequest,
      saveCompletedTransaction,
    }),
    storageClient,
  };
}
