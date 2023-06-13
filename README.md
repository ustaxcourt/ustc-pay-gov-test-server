# USTC Pay.gov Dev Server

This repository houses an app that can be deployed to serve as a development tool for testing US Tax Court applications that interface with Pay.gov. As pay.gov integrations are developed and tested, they should make use of the Development payment portal, which is configured to point to this deployed application.

The application is a SOAP server that handles the same requests that we make to Pay.gov to process payments. The app serves up the `.wsdl` and `.xsd` files, which are based on the resources supplied by Pay.gov, that are required to support the SOAP server.

It also serves up a crude user interface to send users to the Success or Cancel URL, which are specified on the initial API request to start the process.

The development environment of the Payment Portal should be configured point to this application's REST API.

## Workflow

In the following workflow, this USTC Pay.gov Dev Server takes the place of Pay.gov. All transactions are treated as if they will be processed successfully.

1. An application makes a request to initiate a transaction the Development USTC Payment Portal (see [separate repo](https://github.com/ustaxcourt/ustc-payment-portal)).
2. The portal then performs a `startOnlineCollection` request to Pay.gov with the transaction information.
3. Pay.gov responds with a token, which the portal uses to generate a redirect URL to Pay.gov to enter in payment information.
4. The token and URL are returned to the original App, which stores the token, and forwards the user to the URL, which will be a simple UI hosted by this application.
5. The user clicks Complete or Cancel, which sends them back to the success or cancel URL specified in the original request.
6. Once back on the originating App, the app makes another request to the Payment Portal to process the transaction.
7. The payment portal calls Pay.gov to perform a `completeOnlineCollection` with the token.
8. Pay.gov responds with a Tracking ID, which is relayed back to the App via the Portal.

## Environment Variables

Environment variables are located in `./config.dev.yml`, and `dev` is the only stage that should ever be deployed as this server is meant to only be used for development on integrations with Pay.gov.

| Environment Variable | Value                                | Description                                                                                                                           |
| -------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `baseUrl`            | `https://pay-gov-dev.ustaxcourt.gov` | The URL that serves this application. It can be configured to use the execute api URL in case we aren't making use of a custom domain |
| `apiToken`           |                                      | A random string that that is used to authenticate requests                                                                            |

## Deployment

This gets deployed to the USTC Website AWS Account. You will need credentials loaded in order to perform this operation. And you will need the above environment variables specified.

```bash
sls deploy
```

## Testing

Right now there aren't any unit tests, but there are some integration tests that test the deployed application at the base url and the apiToken specified in `config.dev.yml`:

```bash
npm run test:integration
```
