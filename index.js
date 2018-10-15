import { MongoClient } from "mongodb"
import { promisify } from "util"
import mongoDiff from "./mongoDiff"

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
export class SubModel {
  constructor(params = {}) {
    this.current = {}
    const { schema } = this.constructor
    for (const [key, type] of Object.entries(schema)) {
      const { defaultValue, coerce } = analyzeType(type)
      Object.defineProperty(this, key, {
        get() {
          return this.current[key]
        },
        set(value) {
          this.current[key] =
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
    const knownParams = new Set(Object.keys(schema))
    for (const [key, value] of Object.entries(params)) {
      if (knownParams.has(key)) {
        this[key] = value
      }
    }
    this.previous = { ...this.current }
  }

  toObject() {
    return this.current
  }

  toJSON() {
    return this.current
  }
}
export class Model extends SubModel {
  get _id() {
    return this.current._id
  }

  set _id(id) {
    this.current._id = id
  }

  get id() {
    return this._id
  }

  static get collection() {
    const { db, name } = this
    return db.collection(name)
  }

  async save() {
    const { collection } = this.constructor
    if (this._id) {
      collection.asyncUpdateOne = promisify(
        this.constructor.collection.updateOne
      )
      const diff = mongoDiff(this.previous, this.current)
      this.previous = { ...this.current }
      return collection.asyncUpdateOne({ _id: this._id }, diff)
    } else {
      collection.asyncInsertOne = promisify(
        this.constructor.collection.insertOne
      )
      this.previous = { ...this.current }
      return await collection.asyncInsertOne(this.current)
    }
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
