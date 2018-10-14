import { MongoClient } from "mongodb"
import { promisify } from "util"
import mongoDiff from "./mongoDiff"

export class Model {
  constructor(params = {}) {
    this.current = {}
    const { schema } = this.constructor
    for (const [key, type] of Object.entries(schema)) {
      const coerce = type.type || type
      Object.defineProperty(this, key, {
        get() {
          return this.current[key]
        },
        set(value) {
          this.current[key] =
            value === undefined || value === null ? value : coerce(value)
        },
      })
      if (type.default !== undefined && params[key] === undefined) {
        params[key] =
          typeof type.default === "function" ? type.default() : type.default
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
  const client = new MongoClient(url)
  client.asyncConnect = promisify(client.connect)
  await client.asyncConnect()
  Model.db = client.db(databaseName)
}
