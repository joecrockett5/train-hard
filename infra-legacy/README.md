# Legacy AWS deployment config

Nothing in this directory is used by the local Docker stack. It is kept
verbatim so the previous AWS deployment can be reconstructed, and so the
DynamoDB schema has a canonical source.

| File | What it was |
| --- | --- |
| `serverless.yml` | Serverless Framework config: Lambda function, API Gateway REST API with a Cognito authorizer, the `hardResources` DynamoDB table, and the `hardUserPool` Cognito user pool. |
| `lambda-requirements.txt` | Input to `serverless-python-requirements`; built the Lambda layer. |
| `amplify.yml` | AWS Amplify Hosting build spec for the frontend. |
| `amplify.mjs` | Post-build step that repackaged the SvelteKit `adapter-node` output into Amplify's `.amplify-hosting` compute layout. |

## What the local conversion removed

These are the only things you would need to put back to deploy to AWS again.

### Backend

1. **Mangum adapter.** `src/hard/app/main.py` ended with `handler = Mangum(app)`,
   which `serverless.yml` references as `src.hard.app.main.handler`. Both the
   import and that line were removed, and `mangum` was dropped from
   `requirements.txt`.

2. **API Gateway claims reader.** `src/hard/aws/interfaces/fastapi/request.py`
   used to read the Cognito authorizer's injected claims:

   ```python
   def get_aws_event(request: Request) -> dict:
       return request.scope["aws.event"]        # injected by Mangum

   def get_user_claims(request: Request) -> User:
       claims = get_aws_event(request)["requestContext"]["authorizer"]["claims"]
       return User.model_validate({"id": claims["cognito:username"],
                                   "email": claims["email"]})
   ```

   It now resolves the active profile from the `X-Profile-Id` request header
   instead. `get_user_claims()` kept its name and signature, so every route is
   unchanged; only the resolution strategy differs.

### Frontend

3. **Cognito / Amplify sign-in.** `src/routes/+layout.svelte` called
   `Amplify.configure({ Auth: { Cognito: {...} } })` against
   `PUBLIC_USER_POOL_ID`, `PUBLIC_USER_POOL_CLIENT_ID`, `PUBLIC_OAUTH_DOMAIN`
   and `PUBLIC_REDIRECT`, then gated the whole app on `fetchAuthSession()` and
   offered `signInWithRedirect()` (Cognito Hosted UI). The `aws-amplify`
   dependency was removed along with it. Profiles replace it; see the root
   README.

4. **Build-time env vars.** The `$env/static/private` / `$env/static/public`
   imports were switched to their `$env/dynamic/*` equivalents so `HARD_API`
   is read at container start rather than inlined at build time. This change
   is compatible with Amplify Hosting, which also sets env vars at runtime.

## DynamoDB schema

`serverless.yml` remains the source of truth for the table that
`scripts/init_tables.py` creates locally. Keep the two in sync.

```
Table hardResources                     BillingMode PAY_PER_REQUEST
  HASH   User_ObjectType  (S)           "{user_id}#{object_type}"
  RANGE  Timestamp        (S)           ISO-8601

GSI ItemSearch
  HASH   object_id        (S)           Projection: ALL
```
