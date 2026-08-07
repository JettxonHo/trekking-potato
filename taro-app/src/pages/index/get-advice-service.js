function pickDefined(input, names) {
  return names.reduce((data, name) => {
    if (input[name] !== undefined) data[name] = input[name]
    return data
  }, {})
}

function createGetAdviceService({ callFunction }) {
  function request(mode, input, fields) {
    const payload = { mode, ...pickDefined(input || {}, fields) }
    return Promise.resolve()
      .then(() => callFunction({ name: 'getAdvice', data: payload }))
      .then((response) => ({ kind: 'response', result: response && response.result }))
      .catch(() => ({ kind: 'transport_failure' }))
  }

  return {
    prepare(input) {
      return request('prepare', input, [
        'route', 'date', 'level', 'days', 'manualLat', 'manualLon', 'manualElevation',
        'routeType', 'startTimeLocal', 'climbSupport',
      ])
    },
    confirm(input) {
      return request('confirm', input, [
        'candidateId', 'date', 'level', 'days', 'routeType', 'startTimeLocal', 'climbSupport',
      ])
    },
    advice(queryId) {
      return request('advice', { queryId }, ['queryId'])
    },
  }
}

module.exports = { createGetAdviceService }
