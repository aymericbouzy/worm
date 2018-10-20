import QueryBuilder from "./QueryBuilder"

const mongodbQuery = {
  toArray: jest.fn(cb => cb(null, [{ _id: 0, foo: "bar" }])),
}

const collection = {
  find: jest.fn(() => mongodbQuery),
}

beforeEach(() => {
  collection.find.mockClear()
})

it("does operations", async () => {
  const queryBuilder = new QueryBuilder({ collection })
  expect(await queryBuilder.find()).toEqual([{ _id: 0, foo: "bar" }])
  expect(collection.find).toHaveBeenCalledWith({})
  expect(mongodbQuery.toArray).toHaveBeenCalledWith(expect.any(Function))
})

const expectQueryToBeTransformedTo = async (makeQuery, expected) => {
  const queryBuilder = new QueryBuilder({ collection })
  expect(await makeQuery(queryBuilder).find()).toEqual([{ _id: 0, foo: "bar" }])
  expect(collection.find).toHaveBeenCalledWith(expected)
  expect(mongodbQuery.toArray).toHaveBeenCalledWith(expect.any(Function))
}

it("includes equals condition", async () => {
  await expectQueryToBeTransformedTo(
    query => query.where("foo").equals("bar"),
    {
      foo: { $eq: "bar" },
    }
  )
})

it("includes exists condition", async () => {
  await expectQueryToBeTransformedTo(query => query.where("foo").exists(), {
    foo: { $exists: true },
  })
  await expectQueryToBeTransformedTo(
    query => query.where("foo").exists(false),
    {
      foo: { $exists: false },
    }
  )
})

it("includes in and nin condition", async () => {
  await expectQueryToBeTransformedTo(query => query.where("foo").in(["bar"]), {
    foo: { $in: ["bar"] },
  })
  await expectQueryToBeTransformedTo(query => query.where("foo").nin(["baz"]), {
    foo: { $nin: ["baz"] },
  })
})

it("includes elemMatch condition", async () => {
  await expectQueryToBeTransformedTo(
    query => query.where("foo").elemMatch(elem => elem.where("bar").equals(1)),
    { foo: { $elemMatch: { bar: { $eq: 1 } } } }
  )
})

it("includes gt, gte, lt, lte conditions", async () => {
  await expectQueryToBeTransformedTo(
    query =>
      query
        .where("foo")
        .gt(1)
        .lt(3),
    { foo: { $gt: 1, $lt: 3 } }
  )
  await expectQueryToBeTransformedTo(
    query =>
      query
        .where("foo")
        .gte(1)
        .lte(3),
    { foo: { $gte: 1, $lte: 3 } }
  )
})

it("includes ne condition", async () => {
  await expectQueryToBeTransformedTo(query => query.where("foo").ne(3), {
    foo: { $ne: 3 },
  })
})

it("includes or conditions", async () => {
  await expectQueryToBeTransformedTo(
    query =>
      query.or(query => [
        query()
          .where("foo")
          .exists(false),
        query()
          .where("foo")
          .equals(false),
      ]),
    {
      $or: [{ foo: { $exists: false } }, { foo: { $eq: false } }],
    }
  )
})
