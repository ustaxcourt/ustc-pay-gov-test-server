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