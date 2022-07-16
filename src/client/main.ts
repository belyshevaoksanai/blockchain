import { render } from '../../node_modules/lit-html/lit-html.js';
import { Application } from './ui/application.js';


// Флаг предотвращения двойного отображения
let renderingIsInProgress = false;
// передает callback Application
let application = new Application(async () => {
  if (!renderingIsInProgress) {
    renderingIsInProgress = true;
    await 0;
    renderingIsInProgress = false;
    render(application.render(), document.body);
  }
});