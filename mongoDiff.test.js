import mongoDiff from "./mongoDiff"

it("does not change if object is the same", () => {
  expect(mongoDiff({ foo: "bar" }, { foo: "bar" })).toEqual({})
})

it("sets if new property", () => {
  expect(mongoDiff({ foo: 1 }, { foo: 1, bar: 2 })).toEqual({
    $set: { bar: 2 },
  })
})

it("sets if updated property", () => {
  expect(mongoDiff({ foo: 1 }, { foo: 2 })).toEqual({ $set: { foo: 2 } })
})

it("unsets if missing property", () => {
  expect(mongoDiff({ foo: 1 }, {})).toEqual({ $unset: { foo: "" } })
  expect(mongoDiff({ foo: 1 }, { foo: undefined })).toEqual({
    $unset: { foo: "" },
  })
  expect(mongoDiff({ foo: undefined }, {})).toEqual({})
})

describe("sub model", () => {
  it("creates object", () => {
    expect(mongoDiff({}, { foo: {} })).toEqual({ $set: { foo: {} } })
  })

  it("deletes object", () => {
    expect(mongoDiff({ foo: {} }, {})).toEqual({ $unset: { foo: "" } })
  })

  it("sets new properties", () => {
    expect(mongoDiff({ foo: {} }, { foo: { bar: 2 } })).toEqual({
      $set: { "foo.bar": 2 },
    })
  })

  it("updates new properties", () => {
    expect(mongoDiff({ foo: { bar: 1 } }, { foo: { bar: 2 } })).toEqual({
      $set: { "foo.bar": 2 },
    })
  })

  it("removes old properties", () => {
    expect(mongoDiff({ foo: { bar: 1 } }, { foo: {} })).toEqual({
      $unset: { "foo.bar": "" },
    })
  })
})
