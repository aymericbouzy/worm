import { MongoClient } from "mongodb"
import { promisify } from "util"
import mongoDiff from "./mongoDiff"
import QueryBuilder from "./QueryBuilder"

const mapValues = (object, mapper) => {
  const result = {}
  for (const key in object) {
    result[key] = mapper(object[key])
  }
  return result
}

export function analyzeType(type) {
  if (type === Boolean || type === String || type === Number) {
    return { coerce: type }
  }
  if (type === Date) {
    return { coerce: date => new Date(date) }
  }
  if (type.type) {
    const { coerce, defaultValue } = analyzeType(type.type)
    return { coerce, defaultValue: type.default || defaultValue }
  }
  if (Array.isArray(type)) {
    const { coerce } = analyzeType(type[0])
    return {
      coerce: items => items.map(item => coerce(item)),
      defaultValue: () => [],
    }
  }
  const Type =
    type.prototype instanceof SubModel
      ? type
      : class extends SubModel {
          static schema = type
        }
  const makeInstance = params =>
    params instanceof Type ? params : new Type(params)
  return {
    coerce: makeInstance,
    defaultValue: makeInstance,
  }
}

const current = Symbol()
const previous = Symbol()

export class SubModel {
  constructor(params = {}) {
    this[current] = {}
    const { schema } = this.constructor
    for (const [key, type] of Object.entries(schema)) {
      const { defaultValue, coerce } = analyzeType(type)
      Object.defineProperty(this, key, {
        get() {
          return this[current][key]
        },
        set(value) {
          this[current][key] =
            value === undefined || value === null ? value : coerce(value)
        },
      })
      if (defaultValue !== undefined && params[key] === undefined) {
        const tap = arg => {
          return arg
        }
        params[key] = tap(
          typeof defaultValue === "function" ? defaultValue() : defaultValue
        )
      }
    }
    const knownParams = new Set([...Object.keys(schema), "_id"])
    for (const [key, value] of Object.entries(params)) {
      if (knownParams.has(key)) {
        this[key] = value
      }
    }
    this[previous] = params
  }

  toObject() {
    const toObject = value =>
      value && value.toObject
        ? value.toObject()
        : value instanceof Array
          ? value.map(toObject)
          : value
    return mapValues(this[current], toObject)
  }

  toJSON() {
    return this.toObject()
  }
}
export class Model extends SubModel {
  get _id() {
    return this[current]._id
  }

  set _id(id) {
    this[current]._id = id
  }

  get id() {
    return this._id
  }

  static get collection() {
    if (this.memoizedCollection) {
      return this.memoizedCollection
    }
    const { db, name } = this
    const collection = db.collection(name)
    collection.asyncUpdateOne = promisify(collection.updateOne)
    collection.asyncInsertOne = promisify(collection.insertOne)
    return (this.memoizedCollection = collection)
  }

  static query = {}

  static get QueryBuilder() {
    if (this.memoizedQueryBuilder) {
      return this.memoizedQueryBuilder
    }
    const self = this
    class ModelQueryBuilder extends QueryBuilder {
      async find() {
        return (await super.find()).map(object => new self(object))
      }

      async findOne() {
        const found = await super.findOne()
        return found ? new self(found) : null
      }
    }
    this.memoizedQueryBuilder = class extends ModelQueryBuilder {}
    Object.assign(this.memoizedQueryBuilder.prototype, this.query)
    return this.memoizedQueryBuilder
  }

  async save() {
    const { collection } = this.constructor
    const object = this.toObject()
    if (this._id) {
      const diff = mongoDiff(this[previous], object)
      this[previous] = object
      await collection.asyncUpdateOne({ _id: this._id }, diff)
    } else {
      this[previous] = object
      await collection.asyncInsertOne(object)
      this._id = object._id
    }
  }

  static where(path) {
    const queryBuilder = new this.QueryBuilder({ collection: this.collection })
    return queryBuilder.where(path)
  }

  static async find() {
    const { collection } = this
    const query = collection.find()
    query.asyncToArray = promisify(query.toArray)
    return (await query.asyncToArray()).map(object => new this(object))
  }

  static remove() {
    const { collection } = this
    collection.asyncDeleteMany = promisify(collection.deleteMany)
    return collection.asyncDeleteMany({})
  }
}

export async function connect(url, databaseName) {
  const client = new MongoClient(url, { useNewUrlParser: true })
  client.asyncConnect = promisify(client.connect)
  await client.asyncConnect()
  Model.db = client.db(databaseName)
}
