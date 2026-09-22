const { app, BrowserWindow } = require("electron");
const path = require("path");

app.setName("ACNL Turnip Calculator");

function createWindow() {
  const win = new BrowserWindow({
    width: 1120,
    height: 860,
    minWidth: 380,
    minHeight: 640,
    title: "ACNL Turnip Calculator",
    backgroundColor: "#6ed43c",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setTitle("ACNL Turnip Calculator");
  win.loadFile(path.join(__dirname, "../dist/index.html"));
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  app.quit();
});
