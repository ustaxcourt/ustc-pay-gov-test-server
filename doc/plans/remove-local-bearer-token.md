# Remove the access token requirement from local development

## What we want

Right now, anyone running this server on their own machine has to set up an
access token before they can use it. We want to drop that requirement for local
use only. Servers we deploy to AWS keep checking the token exactly as they do
today.

## The one big decision

There are two ways to turn off the token check, and only one of them is safe.

**The risky way** is to skip the check whenever no token is configured. The
problem is what happens when something goes wrong in a deployed environment. If
the token fails to load from AWS for any reason, the server would decide it
doesn't need one, and it would start accepting every request from anyone. The
server would look healthy, and nothing would warn us.

**The safe way** is to skip the check only when the server has been explicitly
told it is running locally. If anything goes wrong in a deployed environment,
requests get rejected. A locked door is a much better failure than an open one.

We already have what we need for the safe approach. The function `isLocal()` in
`src/config/appEnv.ts` reports whether the server is running locally, based on a
setting called `APP_ENV`. Our Terraform configuration sets `APP_ENV` on every
deployed server, so deployed environments always know they are not local.

## Part one: the actual change

### 1. Skip the check when running locally

In `src/lambdas/authenticateRequest.ts`, add an early exit at the top of the
function:

```ts
export const authenticateRequest = (headers?: Headers) => {
  if (isLocal()) {
    return;
  }
  // everything else stays exactly as it is
};
```

You'll need to import `isLocal` from `../config/appEnv`.

Four different places in the code call this function. Because they all funnel
through this one function, this single edit covers all of them. No other source
files need to change.

### 2. Stop anyone from deploying a server in "local" mode

In `terraform/variables.tf`, line 48 currently accepts three values for
`APP_ENV`: `local`, `dev`, and `test`. Change it to accept only `dev` and
`test`, and update the error message below it. Two description lines also need
fixing, since both say "One of: local, dev, test." One is on line 45 of the same
file, the other is in `terraform/modules/lambda/variables.tf`.

**Do this in the same commit as step 1.** Here's why it matters.

After step 1, the `APP_ENV` setting controls whether the server checks tokens at
all. Terraform lets us set that value when we deploy. So without this guard,
someone could change one word in a configuration file and deploy a server that
is reachable on the public internet and accepts every request. Worse, a
reviewer looking at the Terraform plan would just see one word changing from
`dev` to `local`, with nothing to signal that authentication had been switched
off.

To be fair, setting `APP_ENV` to `local` on a deployed server is already a
mistake today. `isLocal()` also controls where the server reads files from, and
in local mode it reads from the computer's own hard drive instead of S3, which
would fail on AWS. So the server would break rather than open up. Step 1 changes
that outcome from "broken" to "wide open," which is why the guard is worth
adding now.

One clarification: the list of valid values inside `src/config/appEnv.ts` should
still include `local`. Running locally is a perfectly normal thing to do. It
just isn't something we ever deploy.

## Part two: tests

### 3. Add a test for the new behavior

In `src/lambdas/authenticateRequest.test.ts`, add a test confirming that when
`APP_ENV` is `local` and no token is provided, the function allows the request
through instead of rejecting it. Set `APP_ENV` at the start of the test and put
it back at the end.

The five tests already in that file don't need any changes. When Jest runs, it
sets things up so the app sees `APP_ENV` as `test`, not `local`. That means
those tests still go through the real token check and still verify that bad
tokens get rejected.

### 4. Keep the "rejects a bad token" test working

There's a test at line 1046 of `test/integration/transaction-http.test.ts` that
sends a deliberately wrong token and expects the server to reject it with a 403
error. After our change, the local server will accept that request and return
success, so this test will start failing.

Don't delete it. It's the only test that checks rejection from end to end.
Instead, turn authentication back on for just that one test:

```js
process.env.APP_ENV = "dev";
try {
  // the existing request and checks, unchanged
} finally {
  process.env.APP_ENV = "local";
}
```

This works because the server checks `APP_ENV` fresh on every single request. It
never remembers the answer. So changing the value takes effect immediately, with
no need to restart anything.

**Putting the value back in the `finally` block is required, not optional.** If
you leave it set to `dev`, every test that runs afterward will try to read files
from S3 instead of the local hard drive, and they'll fail. Using `finally`
guarantees the value gets restored even if the test itself fails partway
through.

This same file already has a helper for safely restoring `APP_ENV`, at lines
7 through 14 of `test/integration/resources.test.ts`. Use it rather than writing
the assignment by hand.

**Leave the other tests alone.** About fifteen other places in the test files
send an access token along with their requests. After our change those tokens
simply get ignored, and they cause no harm. Editing fifteen lines just to remove
something harmless makes the pull request harder to review for no real benefit.

## Part three: everything else

### 5. The part developers will actually notice

This is the whole point of the work.

Some background on why this script matters. We publish this project to npm, and
other teams install it as a dependency. They start it with a single command,
`start-pay-gov-test-server`, which runs `bin/start-pay-gov-test-server.sh`. That
script is the entire setup experience for everyone outside this repository.

Here is what it does today. It moves into the installed copy of this package
inside the consumer's `node_modules` folder. If there's no `.env` file there, it
asks two questions and writes the answers to one:

```bash
read -p "Enter a port to use for test server: " port
read -p "Enter an access token to use when authenticating requests: " access_token
printf "PORT=$port\nACCESS_TOKEN=$access_token" > .env
```

Then it runs `npm run dev` to start the server.

That second question is the friction we're removing. Someone installing a test
server is being asked to invent a password for a service that only talks to
them, on their own machine. They have no way to know what to type, and the
answer never matters.

**The change:** delete the second `read` line, and drop `ACCESS_TOKEN` from the
`printf`. Keep the port question.

**One thing to fix while you're in there.** The script never writes `BASE_URL`,
and the server needs it. `src/useCases/getResource.ts` uses `BASE_URL` to fill in
the service address inside the WSDL file it serves. When the variable is
missing, that address comes out as the literal text `undefined/wsdl/`, so any
SOAP client reading the WSDL gets a broken address. You can build the value from
the port the user already gave you:

```bash
printf "PORT=$port\nBASE_URL=http://localhost:$port\n" > .env
```

Verify this against a real consumer setup before shipping. It's a separate bug
from the one this ticket is about, but it lives in the same four lines, and the
person reviewing this change is the right person to catch it.

**What you do not need to add:** `APP_ENV`. It's tempting, because the server
refuses to start without it. But the `dev` script in `package.json` already sets
`APP_ENV=local` inline before launching the server, so it's always present by
the time the code reads it. Adding it to `.env` would be harmless but redundant.

### 6. Configuration files and documentation

- `.env.example` — remove `ACCESS_TOKEN`, or add a note that it's only needed for deployed environments.
- `src/types/environment.d.ts`, line 11 — mark `ACCESS_TOKEN` as optional by adding a `?`, since local setups no longer have it.
- `README.md` — update the descriptions on lines 11 and 53.
- `running-locally.md` — remove the `authentication` header from the example commands people copy and paste.

### 7. Release note

Add a changeset with a minor version bump. People outside this repository use
this package, and this changes how it behaves for them.

## How to check your work

- Run `npm test`.
- Run `npm run test:integration`.
- Run `npx tsc --noEmit` to confirm there are no type errors.
- Start the server locally and run `curl http://localhost:3366/wsdl` with no token. It should return the file instead of an error.
- Run `terraform validate` and a plan, to confirm the stricter setting still accepts `dev`, which is what our CI uses.

## Problems we found but are not fixing here

These all came up while researching this work. Each is real, and each deserves
its own ticket rather than being bundled into this one.

- **The "deployed" test command doesn't test anything deployed.** The command
  `npm run test:integration:deployed` sounds like it runs tests against our real
  AWS environment. It doesn't. Three of the four test files override the setting
  and start their own local server instead. The fourth one, which would have
  reached the real server, is turned off entirely.

- **A chunk of our CI workflow does nothing.** Lines 43 through 84 of
  `.github/workflows/pr-validate.yml` create a config file, start a server in the
  background, and wait for it to respond. No test actually uses that server. The
  proof is that our other workflow, `test.yml`, runs the very same tests with no
  server at all and passes.

- **Outdated Terraform instructions.** `terraform/README.md` line 105 and
  `terraform/deploy.sh` line 44 both tell you to set a variable called
  `TF_VAR_access_token`. That variable no longer exists. Following those
  instructions sets something nothing reads.
