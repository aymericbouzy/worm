const getSetUnset = (before, after) => {
  const $set = {}
  const $unset = {}
  for (const [key, value] of Object.entries(after)) {
    if (value !== undefined && before[key] !== value) {
      if (value instanceof Object && before[key] instanceof Object) {
        const { $set: nestedSet, $unset: nestedUnset } = getSetUnset(
          before[key],
          after[key]
        )
        for (const [nestedKey, nestedValue] of Object.entries(nestedSet)) {
          $set[`${key}.${nestedKey}`] = nestedValue
        }
        for (const [nestedKey, nestedValue] of Object.entries(nestedUnset)) {
          $unset[`${key}.${nestedKey}`] = nestedValue
        }
      } else {
        $set[key] = value
      }
    }
  }
  for (const [key, value] of Object.entries(before)) {
    if (value !== undefined && after[key] === undefined) {
      $unset[key] = ""
    }
  }
  return { $set, $unset }
}

export default (before, after) => {
  const { $set, $unset } = getSetUnset(before, after)
  const results = {}
  if (Object.keys($set).length > 0) {
    results.$set = $set
  }
  if (Object.keys($unset).length > 0) {
    results.$unset = $unset
  }
  return results
}
