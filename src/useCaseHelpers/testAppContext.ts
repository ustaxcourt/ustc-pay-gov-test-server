import { AppContext } from "../types/AppContext";

export function buildAppContext(
  overrides: {
    getInitiatedTransaction?: jest.Mock;
    saveCompletedTransaction?: jest.Mock;
    completeTransaction?: jest.Mock;
    buildXml?: jest.Mock | Function;
  } = {},
): AppContext {
  return {
    persistenceGateway: () => ({
      getInitiatedTransaction: overrides.getInitiatedTransaction ?? jest.fn(),
      saveCompletedTransaction: overrides.saveCompletedTransaction ?? jest.fn(),
      getCompletedTransaction: jest.fn(),
      saveInitiatedTransaction: jest.fn(),
    }),
    useCaseHelpers: () => ({
      completeTransaction: overrides.completeTransaction ?? jest.fn(),
      buildXml: overrides.buildXml ?? jest.fn(),
    }),
  } as unknown as AppContext;
}
