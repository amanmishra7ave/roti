// server.js
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb+srv://amanmishra7ave:7024274951AasS@cluster0.dujf6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});


// User Model
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  batch: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

// Video Entry Model
const videoEntrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: { type: String, required: true },
  videos: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

const VideoEntry = mongoose.model('VideoEntry', videoEntrySchema);

// Middleware for authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  jwt.verify(token, 'your_jwt_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Auth Routes
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, batch } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      batch,
    });
    await user.save();

    // Generate token
    const token = jwt.sign({ userId: user._id }, 'your_jwt_secret', {
      expiresIn: '24h',
    });

    res.status(201).json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    // Generate token
    const token = jwt.sign({ userId: user._id }, 'your_jwt_secret', {
      expiresIn: '24h',
    });

    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Video Routes
app.post('/videos', authenticateToken, async (req, res) => {
  try {
    const { videos, date } = req.body;

    // Check if entry exists for today
    let entry = await VideoEntry.findOne({
      userId: req.user.userId,
      date,
    });

    if (entry) {
      // Update existing entry
      entry.videos = videos;
      await entry.save();
    } else {
      // Create new entry
      entry = new VideoEntry({
        userId: req.user.userId,
        date,
        videos,
      });
      await entry.save();
    }

    res.status(201).json({ message: 'Videos saved successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error saving videos' });
  }
});

app.get('/videos/:date', authenticateToken, async (req, res) => {
  try {
    const entry = await VideoEntry.findOne({
      userId: req.user.userId,
      date: req.params.date,
    });

    res.json(entry || { videos: [] });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching videos' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});