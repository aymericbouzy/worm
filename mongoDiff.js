export default (before, after) => {
  const $set = {}
  let shouldIncludeSet = false
  const $unset = {}
  let shouldIncludeUnset = false
  for (const [key, value] of Object.entries(after)) {
    if (value !== undefined && before[key] !== value) {
      $set[key] = value
      shouldIncludeSet = true
    }
  }
  for (const [key, value] of Object.entries(before)) {
    if (value !== undefined && after[key] === undefined) {
      $unset[key] = ""
      shouldIncludeUnset = true
    }
  }
  const results = {}
  if (shouldIncludeSet) {
    results.$set = $set
  }
  if (shouldIncludeUnset) {
    results.$unset = $unset
  }
  return results
}
