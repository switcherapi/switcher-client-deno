import { describe, it, afterAll, beforeEach } from "https://deno.land/std@0.147.0/testing/bdd.ts";
import { assertEquals, assertRejects, assertExists } from "https://deno.land/std@0.142.0/testing/asserts.ts";

import { Switcher } from "../mod.ts";
import { given, givenError, tearDown } from "./fixture/utils.ts";

const generateAuth = (token: string, seconds: number) => {
  return { 
    token, 
    exp: (Date.now()+(seconds*1000))/1000
  };
};

const generateStatus = (status: boolean) => {
  return {
    status
  };
};

describe("E2E test - Switcher offline - Snapshot:", function () {
  const token = "[token]";
  const apiKey = "[api_key]";
  const domain = "Business";
  const component = "business-service";
  const environment = "dev";
  const url = "http://localhost:3000";

  const dataBuffer = Deno.readTextFileSync("./snapshot/dev.json");
  const dataJSON = dataBuffer.toString();

  beforeEach(function() {
    Switcher.buildContext({ url, apiKey, domain, component, environment }, {
      offline: true
    });

    Switcher.setTestEnabled();
    tearDown();
  });

  afterAll(function() {
    Switcher.unloadSnapshot();
    Deno.removeSync("generated-snapshots/", { recursive: true });
  });

  it("Should update snapshot", async function () {
    //give
    given("POST@/criteria/auth", generateAuth(token, 5));
    given("GET@/criteria/snapshot_check/:version", generateStatus(false));
    given("POST@/graphql", JSON.parse(dataJSON));

    //test
    Switcher.buildContext({ url, apiKey, domain, component, environment }, {
      snapshotLocation: "generated-snapshots/",
      offline: true
    });
    
    await Switcher.loadSnapshot(true);
    assertEquals(true, await Switcher.checkSnapshot());

    //restore state to avoid process leakage
    Switcher.unloadSnapshot();
  });

  it("Should NOT update snapshot", async function () {
    //given
    given("POST@/criteria/auth", generateAuth(token, 5));
    given("GET@/criteria/snapshot_check/:version", generateStatus(true)); // No available update
    
    //test
    await Switcher.loadSnapshot();
    assertEquals(false, await Switcher.checkSnapshot());
  });

  it("Should NOT update snapshot - check Snapshot Error", async function () {
    //given
    given("POST@/criteria/auth", generateAuth(token, 5));
    givenError("GET@/criteria/snapshot_check/:version", "ECONNREFUSED");
    
    //test
    Switcher.setTestEnabled();
    await Switcher.loadSnapshot();
    await assertRejects(async () =>
        await Switcher.checkSnapshot(), 
        Error, "Something went wrong: Connection has been refused - ECONNREFUSED");
  });

  it("Should NOT update snapshot - resolve Snapshot Error", async function () {
    //given
    given("POST@/criteria/auth", generateAuth(token, 5));
    given("GET@/criteria/snapshot_check/:version", generateStatus(false)); // Snapshot outdated
    givenError("POST@/graphql", "ECONNREFUSED");
    
    //test
    Switcher.setTestEnabled();
    await Switcher.loadSnapshot();
    await assertRejects(async () =>
      await Switcher.checkSnapshot(),
      Error, "Something went wrong: Connection has been refused - ECONNREFUSED");
  });

  it("Should update snapshot", async function () {
    //given
    given("POST@/criteria/auth", generateAuth(token, 5));
    given("GET@/criteria/snapshot_check/:version", generateStatus(false)); // Snapshot outdated
    given("POST@/graphql", JSON.parse(dataJSON));

    //test
    Switcher.buildContext({ url, apiKey, domain, component, environment }, {
      snapshotLocation: "generated-snapshots/"
    });

    await Switcher.loadSnapshot();
    assertExists(Switcher.snapshot);
  });

  it("Should not throw when switcher keys provided were configured properly", async function () {
    await Switcher.loadSnapshot();
    await Switcher.checkSwitchers(["FF2FOR2030"]);
  });

  it("Should throw when switcher keys provided were not configured properly", async function () {
    await Switcher.loadSnapshot();
    await assertRejects(async () =>
      await Switcher.checkSwitchers(["FEATURE02"]),
      Error, "Something went wrong: [FEATURE02] not found");
  });

  it("Should be invalid - Load snapshot was not called", async function () {
    Switcher.buildContext({ url, apiKey, domain, component, environment }, {
      offline: true, logger: true
    });
    
    const switcher = Switcher.factory();
    await assertRejects(async () =>
      await switcher.isItOn("FF2FOR2030"),
      Error, "Snapshot not loaded. Try to use 'Switcher.loadSnapshot()'");
  });

});