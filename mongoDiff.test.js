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
