import { app, screen } from 'electron';
import Store from 'electron-store';

interface ActivityData {
  timestamp: Date;
  window: number;
  application: string;
}

const store = new Store<{ activities: ActivityData[] }>();

function trackActiveWindow(): void {
  const activeWindow = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  
  store.set('activity', {
    timestamp: new Date(),
    window: activeWindow.id,
    application: activeWindow.label
  } as ActivityData);
}

app.on('ready', (): void => {
  setInterval(trackActiveWindow, 1000);
});

app.on('window-all-closed', (): void => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
}); 