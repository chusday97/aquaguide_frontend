import { createApiApp } from './app';
import { apiConfig } from './config';

const app = createApiApp();

app.listen(apiConfig.port, () => {
  console.log(`AquaGuide API server running at http://localhost:${apiConfig.port}`);
});
