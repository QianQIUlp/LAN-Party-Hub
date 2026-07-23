import { expect, test } from "@playwright/test";

interface HostAutomationState {
  error: string | null;
  room: {
    code: string;
    availableGames: Array<{ id: string }>;
    players: Array<{ name: string; isReady: boolean }>;
    selectedGameId: string | null;
    currentRound: { gameId: string; phase: string } | null;
  } | null;
}

test("offline phones recover and three players can switch through all bundled games", async ({ browser, page }) => {
  test.setTimeout(60_000);
  await page.goto("/");

  await expect.poll(() => page.evaluate(() => {
    const bridge = (window as typeof window & {
      __openPartyLabHost?: { getState(): HostAutomationState };
    }).__openPartyLabHost;
    return bridge?.getState().room?.code ?? null;
  })).toBe("E2E0");

  const gameIds = await page.evaluate(() => {
    const bridge = (window as typeof window & {
      __openPartyLabHost?: { getState(): HostAutomationState };
    }).__openPartyLabHost;
    return bridge?.getState().room?.availableGames.map((game) => game.id).sort() ?? [];
  });
  expect(gameIds).toEqual(["bullshit", "imposter", "schaetzorama", "tap-race", "zeichnen-und-erraten"]);

  const phoneOne = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
  const phoneTwo = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const controllerOne = await phoneOne.newPage();
  const controllerTwo = await phoneTwo.newPage();

  for (const controller of [controllerOne, controllerTwo]) {
    await controller.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
        await route.abort();
        return;
      }
      await route.continue();
    });
    await controller.goto("http://127.0.0.1:5174/#join?room=E2E0");
  }

  await controllerOne.getByLabel("昵称").fill("玩家甲");
  await controllerOne.getByRole("button", { name: "加入" }).click();
  await controllerTwo.getByLabel("昵称").fill("玩家乙");
  await controllerTwo.getByRole("button", { name: "加入" }).click();

  await expect(controllerOne.getByRole("heading", { name: "房间 E2E0" })).toBeVisible();
  await expect(controllerTwo.getByRole("heading", { name: "房间 E2E0" })).toBeVisible();

  await page.evaluate(() => {
    (window as typeof window & {
      __openPartyLabHost?: { selectGame(gameId: string): void };
    }).__openPartyLabHost?.selectGame("imposter");
  });
  await expect.poll(() => page.evaluate(() => {
    const bridge = (window as typeof window & {
      __openPartyLabHost?: { getState(): HostAutomationState };
    }).__openPartyLabHost;
    return bridge?.getState().error ?? null;
  })).toContain("3–4");

  await page.evaluate(() => {
    (window as typeof window & {
      __openPartyLabHost?: { selectGame(gameId: string): void };
    }).__openPartyLabHost?.selectGame("tap-race");
  });

  await controllerOne.getByRole("button", { name: "准备", exact: true }).click();
  await controllerTwo.getByRole("button", { name: "准备", exact: true }).click();

  await expect.poll(() => page.evaluate(() => {
    const bridge = (window as typeof window & {
      __openPartyLabHost?: { getState(): HostAutomationState };
    }).__openPartyLabHost;
    return bridge?.getState().room?.players.filter((player) => player.isReady).length ?? 0;
  })).toBe(2);

  await page.evaluate(() => {
    (window as typeof window & {
      __openPartyLabHost?: { startRound(): void };
    }).__openPartyLabHost?.startRound();
  });

  const tapButtonOne = controllerOne.getByRole("button", { name: "点击！" });
  const tapButtonTwo = controllerTwo.getByRole("button", { name: "点击！" });
  await expect(tapButtonOne).toBeEnabled();
  await expect(tapButtonTwo).toBeEnabled();
  await tapButtonOne.click();
  await tapButtonTwo.click();

  await expect(controllerOne.getByRole("heading", { name: "疯狂点击" })).toBeVisible();

  await controllerOne.reload();
  await controllerOne.getByRole("button", { name: "继续上次游戏" }).click();
  await expect(controllerOne.getByRole("heading", { name: "疯狂点击" })).toBeVisible();

  await page.evaluate(() => {
    (window as typeof window & {
      __openPartyLabHost?: { returnToGameSelection(): void };
    }).__openPartyLabHost?.returnToGameSelection();
  });
  await expect.poll(() => page.evaluate(() => {
    const room = (window as typeof window & {
      __openPartyLabHost?: { getState(): HostAutomationState };
    }).__openPartyLabHost?.getState().room;
    return { selectedGameId: room?.selectedGameId ?? null, currentGameId: room?.currentRound?.gameId ?? null };
  })).toEqual({ selectedGameId: null, currentGameId: null });

  const phoneThree = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const controllerThree = await phoneThree.newPage();
  await controllerThree.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
      await route.abort();
      return;
    }
    await route.continue();
  });
  await controllerThree.goto("http://127.0.0.1:5174/#join?room=E2E0");
  await controllerThree.getByLabel("昵称").fill("玩家丙");
  await controllerThree.getByRole("button", { name: "加入" }).click();
  await expect(controllerThree.getByRole("heading", { name: "房间 E2E0" })).toBeVisible();

  const controllers = [controllerOne, controllerTwo, controllerThree];
  for (const gameId of ["tap-race", "zeichnen-und-erraten", "schaetzorama", "imposter", "bullshit"]) {
    await page.evaluate((nextGameId) => {
      (window as typeof window & {
        __openPartyLabHost?: { selectGame(gameId: string): void };
      }).__openPartyLabHost?.selectGame(nextGameId);
    }, gameId);
    await expect.poll(() => page.evaluate(() => {
      return (window as typeof window & {
        __openPartyLabHost?: { getState(): HostAutomationState };
      }).__openPartyLabHost?.getState().room?.selectedGameId ?? null;
    })).toBe(gameId);

    for (const controller of controllers) {
      await expect(controller.getByRole("heading", { name: "房间 E2E0" })).toBeVisible();
      const readyButton = controller.getByRole("button", { name: "准备", exact: true });
      if (await readyButton.isVisible().catch(() => false)) {
        await readyButton.click();
      }
    }

    if (gameId === "tap-race") {
      await page.evaluate(() => {
        (window as typeof window & {
          __openPartyLabHost?: { startRound(): void };
        }).__openPartyLabHost?.startRound();
      });
    }

    await expect.poll(() => page.evaluate(() => {
      return (window as typeof window & {
        __openPartyLabHost?: { getState(): HostAutomationState };
      }).__openPartyLabHost?.getState().room?.currentRound?.gameId ?? null;
    })).toBe(gameId);

    if (gameId === "bullshit") {
      await expect.poll(() => page.evaluate(() => {
        return (window as typeof window & {
          __openPartyLabHost?: { getState(): HostAutomationState };
        }).__openPartyLabHost?.getState().room?.currentRound?.phase ?? null;
      })).toBe("playing");

      const currentControllerIndex = async () => {
        for (let index = 0; index < controllers.length; index += 1) {
          if (await controllers[index].getByText("轮到你", { exact: true }).isVisible().catch(() => false)) {
            return index;
          }
        }
        return -1;
      };

      await expect.poll(currentControllerIndex).toBeGreaterThanOrEqual(0);
      const leaderIndex = await currentControllerIndex();
      const leader = controllers[leaderIndex];
      await expect(leader.getByRole("heading", { name: "吹牛牌", exact: true })).toBeVisible();
      await leader.getByRole("button", { name: "宣称 A", exact: true }).click();
      await leader.locator("button").filter({ hasText: "点击加入本次背面出牌。" }).first().click();
      await leader.getByRole("button", { name: /背面打出 1 张，宣称 A/ }).click();

      const challengerControllerIndex = async () => {
        for (let index = 0; index < controllers.length; index += 1) {
          if (index === leaderIndex) {
            continue;
          }
          const checkButton = controllers[index].getByRole("button", { name: /^Check：质疑最近一手/ });
          if (await checkButton.isVisible().catch(() => false)) {
            return index;
          }
        }
        return -1;
      };

      await expect.poll(challengerControllerIndex).toBeGreaterThanOrEqual(0);
      const challenger = controllers[await challengerControllerIndex()];
      await challenger.getByRole("button", { name: /^Check：质疑最近一手/ }).click();
      await expect(challenger.getByText(/拿走整堆/).first()).toBeVisible();

      await expect.poll(() => page.evaluate(() => {
        return (window as typeof window & {
          __openPartyLabHost?: { getState(): HostAutomationState };
        }).__openPartyLabHost?.getState().error ?? null;
      })).toBeNull();
    }

    await page.evaluate(() => {
      (window as typeof window & {
        __openPartyLabHost?: { returnToGameSelection(): void };
      }).__openPartyLabHost?.returnToGameSelection();
    });
    await expect.poll(() => page.evaluate(() => {
      const room = (window as typeof window & {
        __openPartyLabHost?: { getState(): HostAutomationState };
      }).__openPartyLabHost?.getState().room;
      return { selectedGameId: room?.selectedGameId ?? null, currentGameId: room?.currentRound?.gameId ?? null };
    })).toEqual({ selectedGameId: null, currentGameId: null });
  }

  await phoneThree.close();
  await phoneOne.close();
  await phoneTwo.close();
});
