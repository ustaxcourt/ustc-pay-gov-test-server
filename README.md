# USTC Pay.gov Dev Server

This repository houses an app that can be deployed to serve as a development tool for testing US Tax Court applications that interface with Pay.gov. As pay.gov integrations are developed and tested, they should make use of the [Development payment portal](https://github.com/ustaxcourt/ustc-payment-portal), which is configured to point to this deployed application.

Developers may also run this server locally to test payment integrations with a local instance running of the payment portal.

The application mocks a SOAP server that handles the same requests that we make to Pay.gov to process payments. The app serves up the `.wsdl` and `.xsd` files, which are based on the resources supplied by Pay.gov, that are required to support the SOAP server.

It also serves up a crude UI that directs users to either the Success or Cancel URL, which are specified on the initial API request that initiates the transaction.

The development environment of the Payment Portal should be configured to point to this application's REST API. Configured by [terraform](terraform/README.md), the custom domain name is `https://pay-gov-dev.ustaxcourt.gov`. The token that is used to authenticate requests is located in the `.env.prod` file with the key of `ACCESS_TOKEN`. When the application is deployed, this `ACCESS_TOKEN` becomes an environment variable for the application, and SOAP requests made to the deployed server must include that token.

## Transaction Workflow

In the following workflow, this USTC Pay.gov Dev Server takes the place of Pay.gov. All transactions are treated as if they will be processed successfully.

1. An application makes a request to initiate a transaction the Development USTC Payment Portal (see [separate repo](https://github.com/ustaxcourt/ustc-payment-portal)).
2. The portal then performs a `startOnlineCollection` request to Pay.gov with the transaction information.
3. Pay.gov responds with a token, which the portal uses to generate a redirect URL to Pay.gov to enter in payment information.
4. The token and URL are returned to the original App, which stores the token, and forwards the user to the URL, which will be a simple UI hosted by this application.
5. The user clicks Complete or Cancel, which sends them back to the success or cancel URL specified in the original request.
6. Once back on the originating App, the app makes another request to the Payment Portal to process the transaction.
7. The payment portal calls Pay.gov to perform a `completeOnlineCollection` with the token.
   - If no token is provided, the server returns HTTP 400 with a SOAP fault (return code 4117) matching the real Pay.gov response.
8. Pay.gov responds with a Tracking ID, which is relayed back to the App via the Portal.

## Environment Variables

The `.env` file in this repo is for **local development only** — it provides
the variables a developer needs to run the test server against the local
filesystem (no S3). Deployed environments get their configuration from
Terraform — see [terraform/](terraform/) and
[ADR 0004](doc/architecture/decisions/0004-app-env-vs-node-env.md).

For local setup instructions, see [running-locally.md](running-locally.md).
The full list of variables is in [`.env.example`](.env.example).

### How the environment layer is structured

A few variables have semantic meaning beyond just "set this value":

- **`APP_ENV`** identifies the deployment topology — one of `local`, `dev`,
  or `test`. Read it via `getAppEnv()` / `isLocal()` from
  [`src/config/appEnv.ts`](src/config/appEnv.ts), not directly from `process.env`.
- **`NODE_ENV`** is the Node runtime mode — `development`, `production`, or
  `test`. Set automatically by Jest in test runs.

### Variables

| Environment Variable | Example Value                                                   | Description                                                                                                                                                                                  |
| -------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BASE_URL`           | `https://pay-gov-dev.ustaxcourt.gov` or `http://localhost:3366` | The URL that serves this application.                                                                                                                                                        |
| `ACCESS_TOKEN`       | `asdf123`                                                       | A random string used to authenticate requests. The server looks for the header `Authentication`: `Bearer ${ACCESS_TOKEN}`.                                                                   |
| `PORT`               | `3366`                                                          | The port for the Express server when running locally. Not used on the deployed instance.                                                                                                     |
| `NODE_ENV`           | `development`, `production`, or `test`                          | Node.js runtime mode. Jest sets this to `test` automatically; deployed envs use `production`. Do **not** use this to encode deployment topology — use `APP_ENV` instead.                     |
| `APP_ENV`            | `local`, `dev`, or `test`                                       | Deployment topology. `local` → filesystem storage; `dev` → S3. `test` is a Jest fallback — unit tests should mock `storageClient()` rather than depend on this branch. Read via `isLocal()`. |

## Deployment

This gets deployed to the ent-apps-pay-gov-workloads-dev AWS Account via terraform. The IaC documentation is found [here](terraform/README.md)



Additional files are needed to support the application. These need to be put into the S3 bucket to facilitate the application. They consist of:

- `html/pay.html`
- `wsdl/TCSOnlineService_3_1.wsdl`
- `wsdl/TCSOnlineService_3_1.xsd`
- `wsdl/tcs_common_types.xsd`

## Development

You can run the server locally in order to mock the payment process for local development.

```
npm run dev
```

This will start a dev server at the port specified in the [environment variables](#environment-variables).

### As a dependency
This repo can be installed as a dependency from npm.

```
npm i --save-dev @ustaxcourt/ustc-pay-gov-test-server
```

Once installed, use the following command to start the server:

```
npx @ustaxcourt/ustc-pay-gov-test-server
```

When initially running the server with this command, you will be prompted to enter a port and access token for the test server to use. To update these variables, run the command with the following argument:

```
npx @ustaxcourt/ustc-pay-gov-test-server update-env
```

## Testing

### Unit Tests

```
npm run test
```

### Local Integration Tests

When developing locally, you can run the integration test suite. These simulate the requests that the server should support: serving resources, serving the dev page, and handling transaction requests. Once the dev server is running, use the following command to test the application:

```bash
npm run test:integration
```

### Deployed Integration Tests

To verify the deployed server is running properly, you can run the integration tests against it. This ensures the instance is handling requests as expected, and relies on the proper environment config in `.env.prod`.

```
npm run test:integration:deployed
```

## Publishing

This package is published on `npm` so that we can use it in other libraries. To help manage this, we are using [changesets cli](https://www.npmjs.com/package/@changesets/cli) to specify changes that are locked into semantic versions.

To begin a new changeset, follow these steps:

1. **Make changes** on a feature branch
2. **Add a changeset** to document your changes:
   ```bash
   npx changeset add
   ```
   - Select the package and bump type (patch/minor/major)
   - Write a concise summary for the changelog
3. **Open a PR** and merge to `main`
4. **Review and merge** the "Version Packages" PR that Changesets automatically creates
5. **Automatic publish** via GitHub Actions to npm with provenance

For detailed instructions, see [PUBLISHING.md](./PUBLISHING.md).
