import { Model, connect } from "./index"
import MongodbMemoryServer from "mongodb-memory-server"

class User extends Model {
  static schema = {
    name: String,
    verified: { type: Boolean, default: () => false },
    verifiedAt: Date,
  }
}

class Book extends Model {
  static schema = {
    author: User,
    published: {
      at: Date,
      by: String,
    },
    readers: [User],
    readerIds: [String],
  }

  static query = {
    withReaders() {
      return this.where("readers.0").exists()
    },
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
  await Book.remove()
})

it("stores user to database", async () => {
  const user = new User({ name: "Aymeric" })
  await user.save()
  expect(await User.find()).toEqual([
    expect.objectContaining({ name: "Aymeric" }),
  ])
})

it("works without parameters", () => {
  const user = new User()
  expect(user).toEqual(
    expect.objectContaining({
      save: expect.any(Function),
    })
  )
})

it("works with dates", () => {
  const user = new User({ verifiedAt: new Date() })
  expect(user.verifiedAt).toEqual(expect.any(Date))
})

it("sets some id", async () => {
  const user = new User({ name: "Aymeric" })
  await user.save()
  expect(user._id).not.toBe(undefined)
  expect(user.id).toBe(user._id)
})

it("initializes with id", () => {
  const user = new User({ _id: "test" })
  expect(user.id).toBe("test")
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

  it("sets default values", () => {
    expect(user.verified).toBe(false)
  })

  it("stores boolean", async () => {
    user.verified = true
    await user.save()
    expect(await User.find()).toEqual([
      expect.objectContaining({ verified: true }),
    ])
  })

  it("ignores unknown properties", async () => {
    class User extends Model {
      static schema = {
        name: String,
      }
    }
    const [user] = await User.find()
    expect(user.verified).toBe(undefined)
    expect(user.name).toBe("Aymeric")
  })
})

describe("sub model", () => {
  let book

  beforeEach(async () => {
    book = new Book()
    await book.save()
  })

  it("defines sub models", () => {
    expect(book).toEqual(
      expect.objectContaining({
        author: expect.objectContaining({
          verified: false,
        }),
        published: expect.any(Object),
      })
    )
  })

  it("accepts initial values", () => {
    book = new Book({
      author: { name: "Aymeric" },
      published: {
        at: new Date("2018-08-11"),
        by: "Aymeric's press",
      },
    })
    expect(book).toEqual(
      expect.objectContaining({
        author: expect.objectContaining({
          verified: false,
          name: "Aymeric",
        }),
        published: expect.objectContaining({
          at: expect.any(Date),
          by: "Aymeric's press",
        }),
      })
    )
  })

  it("updates sub model", async () => {
    book.author.name = "Aymeric"
    await book.save()
    expect(book.toObject()).toEqual({
      _id: expect.anything(),
      author: {
        name: "Aymeric",
        verified: false,
      },
      published: {},
      readerIds: [],
      readers: [],
    })
    expect(await Book.find()).toEqual([
      expect.objectContaining({
        author: expect.objectContaining({
          name: "Aymeric",
        }),
      }),
    ])
  })

  describe("array type", () => {
    it("sets initial value to empty array by default", () => {
      expect(book).toEqual(
        expect.objectContaining({
          readers: [],
          readerIds: [],
        })
      )
    })

    it("accepts initial values", () => {
      book = new Book({
        readers: [{ name: "Aymeric" }, { name: "Lucie" }],
        readerIds: [1, 2],
      })
      expect(book).toEqual(
        expect.objectContaining({
          readers: [
            expect.objectContaining({ name: "Aymeric" }),
            expect.objectContaining({ name: "Lucie" }),
          ],
          readerIds: ["1", "2"],
        })
      )
    })

    it("updates array", async () => {
      book.readers = [{ name: "Aymeric" }]
      book.readerIds = [1]
      await book.save()
      expect(await Book.find()).toEqual([
        expect.objectContaining({
          readers: [
            expect.objectContaining({
              name: "Aymeric",
            }),
          ],
          readerIds: ["1"],
        }),
      ])
    })
  })
})

describe("query", () => {
  let aftermath, silmarillion

  beforeEach(async () => {
    aftermath = new Book({
      author: {
        name: "Stephen King",
      },
    })
    await aftermath.save()
    silmarillion = new Book({
      author: {
        name: "J.R.R. Tolkien",
      },
      readers: [{ name: "Aymeric" }],
    })
    await silmarillion.save()
  })

  it("has filters", async () => {
    const books = await Book.where("author.name").equals("Stephen King")
    expect(books).toEqual([
      expect.objectContaining({
        id: aftermath.id,
      }),
    ])
  })

  it("has custom filters", async () => {
    const books = await Book.where().withReaders()
    expect(books).toEqual([expect.objectContaining({ id: silmarillion.id })])
  })

  it("works with findOne", async () => {
    const book = await Book.where("author.name")
      .equals("J.R.R. Tolkien")
      .findOne()
    expect(book.id).toEqual(silmarillion.id)
    expect(
      await Book.where("author.name")
        .equals("Unknown author")
        .findOne()
    ).toBe(null)
  })
})

afterAll(() => {
  mongod.stop()
})
