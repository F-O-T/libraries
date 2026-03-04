import { describe, expect, test as it } from "bun:test";
import { hello } from "./index";

describe("@f-o-t/react-hooks", () => {
  it("should export hello function", () => {
    expect(hello()).toBe("Hello from @f-o-t/react-hooks!");
  });
});
