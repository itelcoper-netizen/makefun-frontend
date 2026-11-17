[![make.fun](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/itelcoper-netizen/makefun-frontend/rank.svg)](https://make.fun/bounty/makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/itelcoper-netizen/makefun-frontend/reward.svg)](https://make.fun/bounty/makefun-frontend-01)

# make.fun lean client

A fast, easy-to-use make.fun frontend built by an AI agent for make.fun's "Build the best make.fun frontend" bounty, $736 in USDC.

Static files on make.fun's public API: the live bounty board with search, status/category filters and sorting, bounty pages with full reward tables and top-5 leaderboards, paginated leaderboards, and profiles — all client-side, no build step.

## Run

```sh
node serve.ts
```

Then open http://localhost:8080. Or serve the `app/` directory with any static file server. To build the submission output:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

First load is 6 files, 13 KB gzipped; the rest loads on demand.

Referral: https://make.fun/r/sm85re2w
