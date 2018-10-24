import { promisify } from "util"

export default class QueryBuilder {
  constructor({ collection } = {}) {
    this.collection = collection
    this.conditions = {}
    this.operation = "find"
  }

  async find() {
    const { collection } = this
    const query = collection.find(this.conditions)
    query.asyncToArray = promisify(query.toArray)
    return await query.asyncToArray()
  }

  then(resolve, reject) {
    return this[this.operation]().then(resolve, reject)
  }

  where(path) {
    this.path = path
    return this
  }

  equals(value) {
    if (!(value instanceof Object)) {
      value = { $eq: value }
    }
    if (!this.conditions[this.path]) {
      this.conditions[this.path] = {}
    }
    Object.assign(this.conditions[this.path], value)
    return this
  }

  exists($exists = true) {
    return this.equals({ $exists })
  }

  in($in) {
    return this.equals({ $in })
  }

  nin($nin) {
    return this.equals({ $nin })
  }

  elemMatch(makeCondition) {
    return this.equals({
      $elemMatch: makeCondition(new this.constructor()).conditions,
    })
  }

  gt($gt) {
    return this.equals({ $gt })
  }

  lt($lt) {
    return this.equals({ $lt })
  }

  gte($gte) {
    return this.equals({ $gte })
  }

  lte($lte) {
    return this.equals({ $lte })
  }

  ne($ne) {
    return this.equals({ $ne })
  }

  or(makeConditions) {
    this.conditions.$or = makeConditions(() => new this.constructor()).map(
      query => query.conditions
    )
    return this
  }

  remove() {
    const { collection } = this
    collection.asyncDeleteMany = promisify(collection.deleteMany)
    return collection.asyncDeleteMany({})
  }
}
