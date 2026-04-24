# First Time Setup

This will give you everything you need to run the test server locally.

- Create a `.env` file and add the following variables:

```
BASE_URL=http://localhost:3366
ACCESS_TOKEN=asdf123
PORT=3366
NODE_ENV=local
```

- Run `npm install`
- Run `npm run build`
- Run `npm run dev`
- At this point you should see server output that looks like this:

```
[timeStampHere] - Starting compilation in watch mode...
[0]
[1] [dotenv@17.2.3] injecting env (3) from .env -- tip: 🔄 add secrets lifecycle management: https://dotenvx.com/ops
[0]
[0] 1:08:47 PM - Found 0 errors. Watching for file changes.
[1] ⚡️[server]: Server is running at http://localhost:3366
[1] [dotenv@17.2.3] injecting env (3) from .env -- tip: 👥 sync secrets across teammates & machines: https://dotenvx.com/ops
[1] ⚡️[server]: Server is running at http://localhost:3366
```

**You can now reach the server at localhost:3366**

## Manual curl testing

Use these commands to manually test the local SOAP flow, including a failed
`completeOnlineCollectionWithDetails` response.

### 1) Start a transaction (get token)

```bash
curl -s -X POST 'http://localhost:3366/wsdl' \
	-H 'Content-Type: application/soap+xml' \
	-H 'authentication: Bearer asdf123' \
	--data-binary @- <<'EOF'
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tcs="http://fms.treas.gov/services/tcsonline_3_1">
	<soapenv:Header/>
	<soapenv:Body>
		<tcs:startOnlineCollection>
			<startOnlineCollectionRequest>
				<tcs_app_id>ustc-test-pay-gov-app</tcs_app_id>
				<agency_tracking_id>curl-test-1</agency_tracking_id>
				<transaction_type>Sale</transaction_type>
				<transaction_amount>25.00</transaction_amount>
				<language>en</language>
				<url_success>https://client.app/success</url_success>
				<url_cancel>https://client.app/cancel</url_cancel>
			</startOnlineCollectionRequest>
		</tcs:startOnlineCollection>
	</soapenv:Body>
</soapenv:Envelope>
EOF
```

`startOnlineCollectionResponse`:

```xml
<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/">
  <S:Header>
    <work:WorkContext xmlns:work="http://oracle.com/weblogic/soap/workarea/">rO0ABXd5ACl3ZWJsb2dpYy5hcHAudGNzb25saW5lLWF wcC02LjAuMC1TTkFQU0hPVAAAANYAAAAjd2VibG9naWMud29ya2FyZWEuU3RyaW5nV29ya0NvbnRleHQAH3Y2LjAuMC1TTkFQU 0hPVF8yMDE1XzEwXzE0XzIyMzgAAA==</work:WorkContext>
  </S:Header>
  <S:Body>
    <ns2:startOnlineCollectionResponse xmlns:ns2="http://fms.treas.gov/services/tcsonline">
      <startOnlineCollectionResponse>
        <token>c132251f9feb4364a39664debcd199bb</token>
      </startOnlineCollectionResponse>
    </ns2:startOnlineCollectionResponse>
  </S:Body>
</S:Envelope>
```

Note: Transaction status is now controlled by token state. When
"Complete Payment (Credit Card - Failed)" is clicked on the pay page, it calls
`POST /pay/fail?token={token}` and marks that token as failed for future
completion and details calls.

Copy the `<token>` from the SOAP response.

### 2) Verify the Pay page

```bash
curl -s "http://localhost:3366/pay?token={token}"
```

The rendered page should include links similar to:

- Complete Payment (PayPal - Success)
- Complete Payment (Credit Card - Success)
- Complete Payment (ACH - Success)
- Complete Payment (Credit Card - Failed)
- Complete Payment (ACH - Failed)
- Complete Payment (PayPal - Failed)
- Cancel Payment

Behavior note:

- If you click `Complete Payment (Credit Card - Failed)` on the pay page, the browser flow already marks the token as failed.
- If you click `Complete Payment` or `Cancel Payment`, token status is not marked failed.

### 3) Optional: Mark token status

Use this curl command only if you did not already click `Complete Payment (Credit Card - Failed)` on the pay page.

```bash
curl -s -X POST "http://localhost:3366/pay/:paymentMethod/:paymentStatus?token=:token"
```

Examples:

```bash
curl -s -X POST "http://localhost:3366/pay/PLASTIC_CARD/Failed?token=c132251f9feb4364a39664debcd199bb"
```

### 4) Complete with details

```bash
curl -s -X POST 'http://localhost:3366/wsdl' \
	-H 'Content-Type: application/soap+xml' \
	-H 'authentication: Bearer asdf123' \
	--data-binary @- <<'EOF'
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tcs="http://fms.treas.gov/services/tcsonline_3_1">
	<soapenv:Header/>
	<soapenv:Body>
		<tcs:completeOnlineCollectionWithDetails>
			<completeOnlineCollectionWithDetailsRequest>
				<tcs_app_id>ustc-test-pay-gov-app</tcs_app_id>
				<token>PASTE_TOKEN_HERE</token>
			</completeOnlineCollectionWithDetailsRequest>
		</tcs:completeOnlineCollectionWithDetails>
	</soapenv:Body>
</soapenv:Envelope>
EOF
```

Copy the `<paygov_tracking_id>` from the SOAP response.

`completeOnlineCollectionWithDetailsResponse`:

```xml
<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/">
  <S:Header>
    <work:WorkContext xmlns:work="http://oracle.com/weblogic/soap/workarea/">rO0ABXd5ACl3ZWJsb2dpYy5hcHAudGNzb25saW5lLWF wcC02LjAuMC1TTkFQU0hPVAAAANYAAAAjd2VibG9naWMud29ya2FyZWEuU3RyaW5nV29ya0NvbnRleHQAH3Y2LjAuMC1TTkFQU 0hPVF8yMDE1XzEwXzE0XzIyMzgAAA==</work:WorkContext>
  </S:Header>
  <S:Body>
    <ns2:completeOnlineCollectionWithDetailsResponse xmlns:ns2="http://fms.treas.gov/services/tcsonline">
      <completeOnlineCollectionWithDetailsResponse>
        <paygov_tracking_id>TMi85c0Se1ILrK298qBdr</paygov_tracking_id>
        <agency_tracking_id>curl-test-1</agency_tracking_id>
        <transaction_amount>25</transaction_amount>
        <transaction_type>Sale</transaction_type>
        <transaction_date>2026-04-23T17:28:22.596Z</transaction_date>
        <payment_date>2026-04-23</payment_date>
        <transaction_status>Success</transaction_status>
        <payment_type>PLASTIC_CARD</payment_type>
        <payment_frequency>ONE_TIME</payment_frequency>
        <number_of_installments>1</number_of_installments>
      </completeOnlineCollectionWithDetailsResponse>
    </ns2:completeOnlineCollectionWithDetailsResponse>
  </S:Body>
</S:Envelope>
```

### 5) Get details for that tracking id

```bash
curl -s -X POST 'http://localhost:3366/wsdl' \
	-H 'Content-Type: application/soap+xml' \
	-H 'authentication: Bearer asdf123' \
	--data-binary @- <<'EOF'
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tcs="http://fms.treas.gov/services/tcsonline_3_1">
	<soapenv:Header/>
	<soapenv:Body>
		<tcs:getDetails>
			<getDetailsRequest>
				<tcs_app_id>ustc-test-pay-gov-app</tcs_app_id>
				<paygov_tracking_id>PASTE_PAYGOV_TRACKING_ID_HERE</paygov_tracking_id>
			</getDetailsRequest>
		</tcs:getDetails>
	</soapenv:Body>
</soapenv:Envelope>
EOF
```

You should see `<transaction_status>Failed</transaction_status>` in both
`completeOnlineCollectionWithDetails` and `getDetails` responses:

```xml

<S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/">
  <S:Header>
    <work:WorkContext xmlns:work="http://oracle.com/weblogic/soap/workarea/">rO0ABXd5ACl3ZWJsb2dpYy5hcHAudGNzb25saW5lLWF wcC02LjAuMC1TTkFQU0hPVAAAANYAAAAjd2VibG9naWMud29ya2FyZWEuU3RyaW5nV29ya0NvbnRleHQAH3Y2LjAuMC1TTkFQU 0hPVF8yMDE1XzEwXzE0XzIyMzgAAA==</work:WorkContext>
  </S:Header>
  <S:Body>
    <ns2:getDetailsResponse xmlns:ns2="http://fms.treas.gov/services/tcsonline">
      <getDetailsResponse>
        <transactions>
          <transaction>
            <paygov_tracking_id>TMi85c0Se1ILrK298qBdr</paygov_tracking_id>
            <agency_tracking_id>curl-test-1</agency_tracking_id>
            <transaction_amount>25</transaction_amount>
            <transaction_type>Sale</transaction_type>
            <transaction_date>2026-04-23T17:28:22.596Z</transaction_date>
            <payment_date>2026-04-23</payment_date>
            <transaction_status>Success</transaction_status>
            <payment_type>PLASTIC_CARD</payment_type>
            <payment_frequency>ONE_TIME</payment_frequency>
            <number_of_installments>1</number_of_installments>
          </transaction>
        </transactions>
      </getDetailsResponse>
    </ns2:getDetailsResponse>
  </S:Body>
</S:Envelope>
```
