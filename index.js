import { MongoClient } from "mongodb"
import { promisify } from "util"
export class Model {
  constructor(params) {
    Object.assign(this, params)
  }

  static get collection() {
    const { db, name } = this
    return db.collection(name)
  }

  toObject() {
    return { name: "Aymeric" }
  }

  save() {
    const { collection } = this.constructor
    collection.asyncInsertOne = promisify(this.constructor.collection.insertOne)
    return collection.asyncInsertOne(this.toObject())
  }

  static find() {
    const { collection } = this
    const query = collection.find()
    query.asyncToArray = promisify(query.toArray)
    return query.asyncToArray()
  }
}

export async function connect(url, databaseName) {
  const client = new MongoClient(url)
  client.asyncConnect = promisify(client.connect)
  await client.asyncConnect()
  Model.db = client.db(databaseName)
}
