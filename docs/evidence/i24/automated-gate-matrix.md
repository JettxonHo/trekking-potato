# I24c automated gate evidence

- Run date: `2026-08-09`
- Branch: `codex/107-beta-acceptance-evidence`
- Head before docs changes: `f8731a387638fd9a3f0e0ce979448e3ed86d4095`
- Scope: fixture-free source and normal generated `taro-app/dist`.
- Runtime model: `UNVERIFIED_RUNTIME_MODEL`.

## Results

The following commands were run from the repository root after the bounded residue scan. Every command exited 0.

```text
npm run test:beta-acceptance       PASS: I24b five-pilot Beta acceptance contract
node -e repeated prepare probe      PASS: repeated prepare keeps old base observable and issues distinct server queryIds
npm run test:confirmation            PASS: I21 candidate confirmation and follow-up contract
npm run test:core-input-flow         PASS: I21 core input-flow BaseData 编排契约
npm run test:result-page             PASS: I22b structured result-page contract
npm run test:hourly-weather          PASS: I14 hourly-weather contract
npm run test:history                 PASS: I19 private history contract
npm run test:recovery                PASS: I23b recovery contract
npm run test:trip-flow               PASS: I20 trip-flow reducer 与 getAdvice service 契约
npm test                            PASS: all registered contracts
npm run test:integration            PASS: 55, FAIL: 0
npm run lint                        PASS: 0 errors, 9 existing warnings
npm run typecheck                   PASS
npm run build:weapp                 PASS: Taro 4.0.9 Webpack compiled successfully
git diff --check                    PASS
```

The beta command logs two expected offline DeepSeek failures (`LLM response content is not JSON` and
`offline LLM transport`) while proving invalid/unavailable AI degradation. They are not hidden command failures.
The root suite retains the known route/weather/unit counts (`91/0`, `86/0`, `55/0`). Integration remains `55/0` by
the I24a structured-adapter baseline.

## Residue scan

Command shape:

```text
rg -n --hidden --glob '!node_modules/**' \
  -e 'VISUAL_FIXTURE|LOCAL_BETA_FIXTURE|local-beta-fixtures|beta[-_ ]fixture|debug scenario|debugScenario|scenario selector' \
  taro-app/src scripts package.json taro-app/config taro-app/dist
```

Result: no matches. `taro-app/src/pages/index/local-beta-fixtures.js` does not exist, `index.jsx` is clean, and
`git status` shows no generated dist or temporary source changes.
