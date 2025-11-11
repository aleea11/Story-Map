import routes from '../routes/routes';
import { getActiveRoute } from '../routes/url-parser';

class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;

  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;

    this.#setupDrawer();
  }

  #setupDrawer() {
    this.#drawerButton.addEventListener('click', () => {
      this.#navigationDrawer.classList.toggle('open');
    });

    document.body.addEventListener('click', (event) => {
      if (
        !this.#navigationDrawer.contains(event.target) &&
        !this.#drawerButton.contains(event.target)
      ) {
        this.#navigationDrawer.classList.remove('open');
      }

      this.#navigationDrawer.querySelectorAll('a').forEach((link) => {
        if (link.contains(event.target)) {
          this.#navigationDrawer.classList.remove('open');
        }
      });
    });
  }

  async renderPage() {
    const url = getActiveRoute();
    const page = routes[url];

    if (page) {
      // Check if View Transition API is supported
      if (document.startViewTransition) {
        const transition = document.startViewTransition(async () => {
          this.#content.innerHTML = await page.render();
          await page.afterRender();
        });
        
        // Add custom transition styles
        transition.ready.then(() => {
          document.documentElement.style.setProperty('--transition-duration', '300ms');
        });
      } else {
        // Fallback for browsers without View Transition API
        this.#content.style.opacity = '0';
        this.#content.style.transform = 'translateY(20px)';
        
        setTimeout(async () => {
          this.#content.innerHTML = await page.render();
          await page.afterRender();
          
          this.#content.style.opacity = '1';
          this.#content.style.transform = 'translateY(0)';
        }, 150);
      }
    } else {
      this.#content.innerHTML = '<h1>Page Not Found</h1>';
    }
  }
}

export default App;