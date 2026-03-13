import { describe, expect, it } from "vitest";

import { Friend, User } from "./models/user";
import { a, getSchemaByType, is, namedSchema, schema, validate } from "../src/index";

@schema({
  compose: (o) => o.stripUnknown(),
})
class UserWithCompose {
  constructor(args: { name: string }) {
    this.name = args.name;
  }

  @is(a.string().required())
  name: string;
}

@namedSchema("user-compose", {
  compose: (o) => o.noUnknown(true),
})
class NamedUserWithCompose {
  constructor(args: { name: string }) {
    this.name = args.name;
  }

  @is(a.string().required())
  name: string;
}

describe("EnYupSchema method ", () => {
  describe("preserve class instances", function () {
    it("should convert valid objects in instances", async () => {
      const actual = await validate({
        object: getValidObject(),
        schemaName: "user",
      });
      expect(actual).toEqual(getValidUser());
      expect(actual instanceof User).toBe(true);
    });

    it("should convert valid objects in instances", async () => {
      const actual = await validate({
        object: getValidObject(),
        schemaName: "user",
      });
      expect(actual).toEqual(getValidUser());
      expect(actual instanceof User).toBe(true);
    });

    it("should convert valid objects in instances", async () => {
      const actual = await validate({
        object: getValidObject(),
        schemaName: User,
      });

      expect(actual).toEqual(getValidUser());
      expect(actual instanceof User).toBe(true);
    });

    it("should preserve instances", async () => {
      const object = getValidUser();
      const actual = await validate({
        object,
        schemaName: User,
      });

      expect(object).toBe(actual);
      expect(actual instanceof User).toBe(true);
    });

    it("should reject invalid objects", async () => {
      const object = { name: "" };
      await expect(validate({ object, schemaName: User })).rejects.toMatchObject({
        name: "ValidationError",
        errors: ["Name is required", "Date is required"],
      });
    });
  });

  it("should pick", async () => {
    expect(getSchemaByType(User).pick(["name"]).describe()).toEqual(
      a.object({ name: a.string().required() }).describe(),
    );
  });

  it("should omit", async () => {
    expect(getSchemaByType(User).omit(["name", "friends"]).describe()).toEqual(
      a.object({ birthday: a.date().required() }).describe(),
    );
  });

  it("should partial", async () => {
    const partialSchema = getSchemaByType(User).partial();
    const result = await partialSchema.validate({});
    expect(result).toEqual({});
  });

  it("should deepPartial", async () => {
    const deepPartialSchema = getSchemaByType(User).deepPartial();
    const result = await deepPartialSchema.validate({ name: "Mattia" });
    expect(result).toEqual({ name: "Mattia" });
  });

  it("should from", async () => {
    const schema = getSchemaByType(User)
      .omit(["name"])
      .shape({ fullName: a.string().required() })
      .from("name", "fullName");
    const result = await schema.validate({ name: "Mattia", birthday: birthday.toString() });
    expect(result).toHaveProperty("fullName", "Mattia");
  });

  it("should noUnknown", async () => {
    const schema = getSchemaByType(User).pick(["name"]).noUnknown(true);
    const result = await schema.validate({ name: "Mattia", unknownKey: "value" });
    expect(result).toEqual({ name: "Mattia" });
    expect(result).not.toHaveProperty("unknownKey");
  });

  it("should stripUnknown", async () => {
    const s = getSchemaByType(User).pick(["name"]).stripUnknown();
    const result = await s.validate({ name: "Mattia", unknownKey: "value" });
    expect(result).toEqual({ name: "Mattia" });
  });

  describe("compose option", () => {
    it("should apply compose callback with @schema()", async () => {
      const result = await validate({
        object: { name: "Mattia", unknownKey: "value" },
        schemaName: UserWithCompose,
      });
      expect(result).toEqual({ name: "Mattia" });
      expect(result).not.toHaveProperty("unknownKey");
    });

    it("should apply compose callback with @namedSchema()", async () => {
      const result = await validate({
        object: { name: "Mattia" },
        schemaName: "user-compose",
      });
      expect(result).toEqual({ name: "Mattia" });
    });

    it("should strip unknown keys when compose uses noUnknown(true)", async () => {
      const result = await validate({
        object: { name: "Mattia", unknownKey: "value" },
        schemaName: "user-compose",
      });
      expect(result).toEqual({ name: "Mattia" });
      expect(result).not.toHaveProperty("unknownKey");
    });
  });
});

const birthday = new Date(1997, 11, 12);

function getValidUser() {
  return new User({ name: "Mattia", birthday, friends: { "1": new Friend({ name: "Vincenzo" }) } });
}

function getValidObject() {
  return { name: "Mattia", birthday: birthday.toString(), friends: { "1": { name: "Vincenzo" } } };
}
