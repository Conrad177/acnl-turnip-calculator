const { app, BrowserWindow } = require("electron");
const path = require("path");

app.setName("Turnip Ledger");

function createWindow() {
  const win = new BrowserWindow({
    width: 1120,
    height: 860,
    minWidth: 380,
    minHeight: 640,
    title: "Turnip Ledger",
    backgroundColor: "#f3ead7",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setTitle("Turnip Ledger");
  win.loadFile(path.join(__dirname, "../dist/index.html"));
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  app.quit();
});
