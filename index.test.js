import { Model, connect } from "./index"
import MongodbMemoryServer from "mongodb-memory-server"

class User extends Model {
  static schema = {
    name: String,
  }
}

let mongod

beforeAll(async () => {
  mongod = new MongodbMemoryServer()
  const uri = await mongod.getConnectionString()
  const databaseName = await mongod.getDbName()
  await connect(
    uri,
    databaseName
  )
})

it("stores user to database", async () => {
  const user = new User({ name: "Aymeric" })
  await user.save()
  expect(await User.find()).toEqual([
    expect.objectContaining({ name: "Aymeric" }),
  ])
})

afterAll(() => {
  mongod.stop()
})
