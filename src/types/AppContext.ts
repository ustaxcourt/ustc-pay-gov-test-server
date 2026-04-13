import { GetCompletedTransaction } from "../persistence/getCompletedTransaction";
import { GetInitiatedTransaction } from "../persistence/getInitiatedTransaction";
import { SaveCompletedTransaction } from "../persistence/saveCompletedTransaction";
import { SaveInitiatedTransaction } from "../persistence/saveInitatedTransaction";
import { ShowPayPage } from "../useCases/showPayPage";
import { HandleStartOnlineCollection } from "../useCases/handleStartOnlineCollection";
import { HandleCompletOnlineCollectionWithDetails } from "../useCases/handleCompleteOnlineCollectionWithDetails";
import { HandleCompleteOnlineCollection } from "../useCases/handleCompleteOnlineCollection";
import { GetResource } from "../useCases/getResource";
import { BuildXml } from "../useCaseHelpers/buildXml";
import { GetFile } from "./GetFile";
import { SaveFile } from "./SaveFile";
import { HandleGetDetails } from "../useCases/handleGetDetails";
import { CompleteTransaction } from "../useCaseHelpers/completeTransaction";
import { HandleMarkPaymentStatus } from "../useCases/handleMarkPaymentStatus";

export type AppContext = {
  useCases: () => {
    getResource: GetResource;
    handleCompleteOnlineCollection: HandleCompleteOnlineCollection;
    handleCompleteOnlineCollectionWithDetails: HandleCompletOnlineCollectionWithDetails;
    handleGetDetails: HandleGetDetails;
    handleMarkPaymentStatus: HandleMarkPaymentStatus;
    handleStartOnlineCollection: HandleStartOnlineCollection;
    showPayPage: ShowPayPage;
  };
  useCaseHelpers: () => {
    buildXml: BuildXml;
    completeTransaction: CompleteTransaction;
  };
  persistenceGateway: () => {
    getCompletedTransaction: GetCompletedTransaction;
    getInitiatedTransaction: GetInitiatedTransaction;
    saveCompletedTransaction: SaveCompletedTransaction;
    saveInitiatedTransaction: SaveInitiatedTransaction;
  };
  storageClient: () => {
    getFile: GetFile;
    saveFile: SaveFile;
  };
  files: { [key: string]: string };
};
