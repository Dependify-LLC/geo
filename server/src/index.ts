import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import searchRoutes from './routes/search';
import authRoutes from './auth/routes';
import locationsRoutes from './routes/locations';
import reportRoutes from './routes/reports';
import businessesRoutes from './routes/businesses';

const app = express();

app.use(cors());
app.use(express.json());

// Register Routes
// Register Routes
app.use('/api/search', searchRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/businesses', businessesRoutes);

// Serve static files from the client app
import path from 'path';
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Export the app for Vercel
export default app;

// Only listen if not running in Vercel (or similar serverless environment)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}
