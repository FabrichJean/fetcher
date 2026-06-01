import { registerRootComponent } from 'expo';
import App from './App';

// Widget task must be registered at module level, before the app mounts
import { registerWidgetTask } from './src/widgets/widgetTask';
registerWidgetTask();

registerRootComponent(App);
