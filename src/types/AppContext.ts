import { GetCompletedTransaction } from "../persistence/getCompletedTransaction";
import { GetTransactionRequest } from "../persistence/getTransactionRequest";
import { SaveCompletedTransaction } from "../persistence/saveCompletedTransaction";
import { SaveTransactionRequest } from "../persistence/saveTransactionRequest";
import { ShowPayPage } from "../useCases/showPayPage";
import { HandleStartOnlineCollection } from "../useCases/handleStartOnlineCollection";
import { HandleCompletOnlineCollectionWithDetails } from "../useCases/handleCompleteOnlineCollectionWithDetails";
import { HandleCompleteOnlineCollection } from "../useCases/handleCompleteOnlineCollection";
import { GetResource } from "../useCases/getResource";
import { BuildXml } from "../useCaseHelpers/buildXml";
import { GetFile } from "./GetFile";
import { SaveFile } from "./SaveFile";

export type AppContext = {
  useCases: () => {
    getResource: GetResource;
    handleCompleteOnlineCollection: HandleCompleteOnlineCollection;
    handleCompleteOnlineCollectionWithDetails: HandleCompletOnlineCollectionWithDetails;
    handleStartOnlineCollection: HandleStartOnlineCollection;
    showPayPage: ShowPayPage;
  };
  useCaseHelpers: () => {
    buildXml: BuildXml;
  };
  persistenceGateway: () => {
    getCompletedTransaction: GetCompletedTransaction;
    getTransactionRequest: GetTransactionRequest;
    saveCompletedTransaction: SaveCompletedTransaction;
    saveTransactionRequest: SaveTransactionRequest;
  };
  storageClient: () => {
    getFile: GetFile;
    saveFile: SaveFile;
  };
};
