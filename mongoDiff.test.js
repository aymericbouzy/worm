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

it("works with dates", () => {
  const date = new Date()
  expect(mongoDiff({}, { foo: date })).toEqual({ $set: { foo: date } })
})

describe("sub model", () => {
  it("creates object", () => {
    expect(mongoDiff({}, { foo: {} })).toEqual({ $set: { foo: {} } })
    expect(mongoDiff({}, { foo: { bar: 1 } })).toEqual({
      $set: { foo: { bar: 1 } },
    })
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

describe("array", () => {
  it("sets array", () => {
    expect(mongoDiff({}, { foo: [] })).toEqual({ $set: { foo: [] } })
    expect(mongoDiff({}, { foo: ["bar"] })).toEqual({ $set: { foo: ["bar"] } })
    expect(mongoDiff({}, { foo: [{ bar: 1 }] })).toEqual({
      $set: { foo: [{ bar: 1 }] },
    })
  })

  it("adds element", () => {
    expect(mongoDiff({ foo: [] }, { foo: ["bar"] })).toEqual({
      $set: { "foo.0": "bar" },
    })
    expect(mongoDiff({ foo: ["bar"] }, { foo: ["bar", "baz"] })).toEqual({
      $set: { "foo.1": "baz" },
    })
    expect(mongoDiff({ foo: [] }, { foo: [{ bar: 1 }] })).toEqual({
      $set: { "foo.0": { bar: 1 } },
    })
  })

  it("updates element", () => {
    expect(mongoDiff({ foo: ["bar"] }, { foo: ["baz"] })).toEqual({
      $set: { "foo.0": "baz" },
    })
    expect(mongoDiff({ foo: [{ bar: 1 }] }, { foo: [{ bar: 2 }] })).toEqual({
      $set: { "foo.0.bar": 2 },
    })
    expect(mongoDiff({ foo: [{ bar: 1 }] }, { foo: [{}] })).toEqual({
      $unset: { "foo.0.bar": "" },
    })
  })

  it("removes element", () => {
    expect(mongoDiff({ foo: [{ bar: 1 }] }, { foo: [] })).toEqual({
      $unset: { "foo.0": "" },
    })
  })
})
