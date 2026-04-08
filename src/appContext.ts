import { storageClient } from "./client/storageClient";
import { getResource } from "./useCases/getResource";
import { handleCompleteOnlineCollection } from "./useCases/handleCompleteOnlineCollection";
import { handleStartOnlineCollection } from "./useCases/handleStartOnlineCollection";
import { showPayPage } from "./useCases/showPayPage";
import { buildXml } from "./useCaseHelpers/buildXml";
import { getCompletedTransaction } from "./persistence/getCompletedTransaction";
import { getInitiatedTransaction } from "./persistence/getInitiatedTransaction";
import { saveCompletedTransaction } from "./persistence/saveCompletedTransaction";
import { saveInitiatedTransaction } from "./persistence/saveInitatedTransaction";
import { handleCompleteOnlineCollectionWithDetails } from "./useCases/handleCompleteOnlineCollectionWithDetails";
import { handleGetDetails } from "./useCases/handleGetDetails";
import { completeTransaction } from "./useCaseHelpers/completeTransaction";
import { handleMarkPaymentFailed } from "./useCases/handleMarkPaymentFailed";

export function createAppContext() {
  return {
    useCases: () => ({
      getResource,
      handleCompleteOnlineCollection,
      handleCompleteOnlineCollectionWithDetails,
      handleGetDetails,
      handleMarkPaymentFailed,
      handleStartOnlineCollection,
      showPayPage,
    }),
    useCaseHelpers: () => ({
      buildXml,
      completeTransaction,
    }),
    persistenceGateway: () => ({
      getCompletedTransaction,
      getInitiatedTransaction,
      saveCompletedTransaction,
      saveInitiatedTransaction,
    }),
    storageClient,
    files: {},
  };
}
