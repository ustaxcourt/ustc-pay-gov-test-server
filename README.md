# USTC Pay.gov Dev Server

This repository houses an app that can be deployed to serve as a development tool for testing US Tax Court applications that interface with Pay.gov.

The application handles the requests that we make to Pay.gov in order to process payments. It also serves up a crude user interface to send users to the Success or Cancel URL, which are specified on the initial API request to start the process. The development environment of the Payment Portal should be configured point to this application's REST API.

## Workflow

In the following workflow, this USTC Pay.gov Dev Server takes the place of Pay.gov. All transactions are treated as if they will be processed successfully.

1. An application makes a request to initiate a transaction the Development USTC Payment Portal (see separate repo).
2. The portal then performs a `startOnlineCollection` request to Pay.gov with the transaction information.
3. Pay.gov responds with a token, which the portal uses to generate a redirect URL to Pay.gov to enter in payment information.
4. The token and URL are returned to the original App, which stores the token, and forwards the user to the URL, which will be a simple UI hosted by this application.
5. The user clicks Complete or Cancel, which sends them back to the success or cancel URL specified in the original request.
6. Once back on the originating App, the app makes another request to the Payment Portal to process the transaction.
7. The payment portal calls Pay.gov to perform a `completeOnlineCollection` with the token.
8. Pay.gov responds with a Tracking ID, which is relayed back to the App via the Portal.
