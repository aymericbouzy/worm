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

afterEach(async () => {
  await User.remove()
})

it("stores user to database", async () => {
  const user = new User({ name: "Aymeric" })
  await user.save()
  expect(await User.find()).toEqual([
    expect.objectContaining({ name: "Aymeric" }),
  ])
})

it("sets some id", async () => {
  const user = new User({ name: "Aymeric" })
  await user.save()
  expect(user._id).not.toBe(undefined)
  expect(user.id).toBe(user._id)
})

describe("user was created", () => {
  let user

  beforeEach(async () => {
    user = new User({ name: "Aymeric" })
    await user.save()
  })

  it("updates user without recreating it", async () => {
    const users = await User.find()
    expect(users).toEqual([expect.objectContaining({ name: "Aymeric" })])
    user.name = "Lucie"
    await user.save()
    expect(await User.find()).toEqual([
      expect.objectContaining({ _id: users[0]._id, name: "Lucie" }),
    ])
  })

  it("removes property", async () => {
    user.name = undefined
    await user.save()
    expect(user.name).toBe(undefined)
  })

  it("sets to the correct type", () => {
    user.name = 123
    expect(user.name).toBe("123")
    const otherUser = new User({ name: 123 })
    expect(otherUser.name).toBe("123")
  })
})

afterAll(() => {
  mongod.stop()
})
