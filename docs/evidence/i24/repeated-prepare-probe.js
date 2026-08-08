/* I24c evidence-only probe for replacement query authority. */
const assert = require('node:assert/strict')
const {
  PILOTS,
  TEST_DATE,
  TEST_START_TIME,
  createHarness,
} = require('../../../scripts/fixtures/beta-acceptance')

const pilot = PILOTS[0]
const request = {
  mode: 'prepare',
  route: pilot.name,
  date: TEST_DATE,
  startTimeLocal: TEST_START_TIME,
  level: '中级',
  days: 99,
}

function routeIdentity(response, label) {
  assert.equal(response.phase, 'base', `${label}: response must be base`)
  assert.equal(response.ok, true, `${label}: base response must be ok`)
  assert.equal(typeof response.queryId, 'string', `${label}: server queryId is required`)
  const route = response.data.routeSnapshot
  assert.ok(route, `${label}: route snapshot is required`)
  return {
    routeVariantId: route.routeVariantId,
    canonicalName: route.canonicalName,
    entityKind: route.entityKind,
    capability: route.capability,
    routeType: route.routeType,
    fixedDays: route.fixedDays,
  }
}

async function main() {
  const harness = createHarness()
  try {
    const first = await harness.getAdvice.main(request)
    const second = await harness.getAdvice.main(request)
    const firstIdentity = routeIdentity(first, 'first prepare')
    const secondIdentity = routeIdentity(second, 'second prepare')

    assert.notEqual(first.queryId, second.queryId, 'replacement prepare must issue a distinct server queryId')
    assert.deepEqual(secondIdentity, firstIdentity, 'replacement prepare must preserve trusted route identity')
    console.log('PASS: repeated prepare returns two base responses with distinct queryIds and stable trusted route identity')
  } finally {
    harness.restore()
  }
}

main().catch((error) => {
  console.error(`FAIL: ${error.message}`)
  process.exitCode = 1
})
