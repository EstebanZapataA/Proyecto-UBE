import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`BROWSER CONSOLE [${msg.type()}]:`, msg.text());
  });
  
  page.on('pageerror', err => {
    console.log('BROWSER ERROR:', err.toString());
  });
  
  await page.goto('http://localhost:3000/');
  await page.waitForSelector('.module-card'); // wait for load
  
  // click module 1
  await page.evaluate(() => {
    document.querySelector('.module-card button').click();
  });
  
  // wait a bit for game to start
  await new Promise(r => setTimeout(r, 2000));
  
  const hasGame = await page.evaluate(() => {
    return !!window.activePhaserGame;
  });
  
  console.log("Game created?", hasGame);
  
  if (hasGame) {
    const gameInfo = await page.evaluate(() => {
      const scene = window.activePhaserGame.scene.scenes[0];
      return {
        displayListCount: scene.sys.displayList.length,
        textures: Object.keys(window.activePhaserGame.textures.list),
        cameraX: scene.cameras.main.scrollX,
        cameraY: scene.cameras.main.scrollY,
        playerY: scene.player ? scene.player.y : 'no player'
      };
    });
    console.log("Game Info:", JSON.stringify(gameInfo, null, 2));
  }
  
  await browser.close();
})();
